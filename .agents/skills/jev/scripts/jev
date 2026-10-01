#!/usr/bin/env python3
# jev - TypeSafe Jev 决策模型命令行工具
#
# 把模糊判断变成带校准概率的类型化答案，可直接用于 shell 管道和 if 判断。
# 默认通过 TypeSafe 官方 API 调用 Jev 模型，也可切换到 OpenRouter 的 decisions 接口。
#
# Author: okooo5km(十里)
#
# 依赖：仅 Python 标准库 (urllib/json/argparse/concurrent.futures)。
# 兼容 Python 3.9+；TOML 格式的 spec 需要 3.11+ (tomllib)，JSON 格式的 spec
# 在任何 3.9+ 版本都可用。

from __future__ import annotations

import argparse
import base64
import configparser
import errno
import getpass
import http.client
import ipaddress
import json
import os
import queue
import random
import re
import socket
import ssl
import stat
import sys
import threading
import time
import traceback
import unicodedata
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

try:
    import tomllib
except ImportError:  # Python < 3.11
    tomllib = None

VERSION = "0.3.2"
USER_AGENT = f"jev-cli/{VERSION} (+https://github.com/okooo5km/jev)"
SIZE_WARN_TOKENS = 30000

# --------------------------------------------------------------------------
# provider 表：所有 provider 特定的东西都从这里读，多一个网关只需要多一条记录。
# --------------------------------------------------------------------------

PROVIDERS = {
    "typesafe": {
        "label": "TypeSafe",
        "base_url": "https://api.typesafe.ai/v1/systemone",
        "key_url": "https://api.typesafe.ai/v1/models",
        "key_env": "TYPESAFE_API_KEY",
        "default_model": "jev-latest",
        "key_page": "https://console.typesafe.ai/settings/keys",
        "key_prefix": None,
        "extra_headers": {},
        "price_per_mtok": 0.042,  # 输出免费，只有输入计费
    },
    "openrouter": {
        "label": "OpenRouter",
        "base_url": "https://openrouter.ai/api/alpha/decisions",
        "key_url": "https://openrouter.ai/api/v1/key",
        "key_env": "OPENROUTER_API_KEY",
        "default_model": "~typesafe/jev-latest",
        "key_page": "https://openrouter.ai/keys",
        "key_prefix": "sk-or-",
        "extra_headers": {"X-Title": "jev-cli", "HTTP-Referer": "https://github.com/okooo5km/jev"},
        "price_per_mtok": None,  # 响应自带 usage.cost，不需要估算
    },
}
DEFAULT_PROVIDER = "typesafe"


# --------------------------------------------------------------------------
# 错误类型
# --------------------------------------------------------------------------

class JevError(Exception):
    """携带退出码的用户可见错误，消息已是中文，可直接打印到 stderr。"""

    def __init__(self, message, exit_code=2):
        super().__init__(message)
        self.exit_code = exit_code


class JevNetworkError(Exception):
    """底层网络失败，仅用于重试循环内部。"""


# --------------------------------------------------------------------------
# .env / API key
# --------------------------------------------------------------------------

def config_dir():
    """配置目录：$XDG_CONFIG_HOME/jev，否则 ~/.config/jev。"""
    base = os.environ.get("XDG_CONFIG_HOME") or os.path.expanduser("~/.config")
    return os.path.join(base, "jev")


def parse_env_file(path):
    result = {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if line.startswith("export "):
                    line = line[len("export "):].strip()
                if "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip()
                if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                    v = v[1:-1]
                result[k] = v
    except OSError:
        return {}
    return result


def default_env_path():
    return os.path.join(config_dir(), ".env")


def config_ini_path():
    """非密钥设置的位置：<config dir>/config.ini（权限 0644，可读）。密钥只存在
    <config dir>/.env（权限 0600）——两者分开，同 gh 的 hosts.yml/config.yml、
    aws 的 credentials/config、llm 的 keys.json。"""
    return os.path.join(config_dir(), "config.ini")


def read_pinned_provider():
    """读取 config.ini 里 [jev] provider 的值；文件不存在/解析失败/未设置都返回 None。"""
    parser = _load_config_ini()
    if parser is None or not parser.has_section("jev"):
        return None
    val = parser.get("jev", "provider", fallback=None)
    return val.strip() if val else None


def _load_config_ini():
    """解析 config.ini；文件不存在返回 None。解析失败必须报错而不是当成没有——
    静默忽略会让固定好的 provider 悄悄失效，写入时还会覆盖掉用户的文件。"""
    path = config_ini_path()
    if not os.path.isfile(path):
        return None
    parser = configparser.ConfigParser(interpolation=None)
    try:
        with open(path, "r", encoding="utf-8") as f:
            parser.read_file(f)
    except (configparser.Error, OSError, UnicodeDecodeError) as e:
        raise JevError(f"jev: 无法解析 {path}（{e}）。请修正或删除该文件。", 2)
    return parser


def write_pinned_provider(value):
    """写入（或 value=None 时清除）config.ini 的 [jev] provider，原子替换，保留其它
    section/key，权限 0644（不是密钥，不需要 0600）。返回写入的文件路径。"""
    cfg_dir = config_dir()
    os.makedirs(cfg_dir, mode=0o700, exist_ok=True)
    path = config_ini_path()
    parser = _load_config_ini() or configparser.ConfigParser(interpolation=None)
    if value is None:
        if parser.has_section("jev"):
            parser.remove_option("jev", "provider")
    else:
        if not parser.has_section("jev"):
            parser.add_section("jev")
        parser.set("jev", "provider", value)

    tmp_path = os.path.join(cfg_dir, f".jev-config-{os.getpid()}-{int(time.time() * 1000)}.tmp")
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            parser.write(f)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, path)
    except BaseException:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise
    os.chmod(path, 0o644)
    return path


def locate_api_key(provider):
    """单一查找实现，供决策调用、`auth status`、`auth check` 共用。

    返回 (key, source, path)：
      - 命中环境变量：("<key>", "env", None)
      - 命中 $JEV_ENV_FILE：("<key>", "JEV_ENV_FILE", "<file 路径>")
      - 命中配置目录 .env：("<key>", "config", "<file 路径>")
      - 未命中：(None, None, "<配置目录 .env 的路径，供报错/提示使用>")
    """
    key_env = PROVIDERS[provider]["key_env"]
    key = os.environ.get(key_env)
    if key:
        return key.strip(), "env", None

    default_env = default_env_path()
    candidates = []
    env_file = os.environ.get("JEV_ENV_FILE")
    if env_file:
        candidates.append(("JEV_ENV_FILE", env_file))
    candidates.append(("config", default_env))

    for source, path in candidates:
        if path and os.path.isfile(path):
            data = parse_env_file(path)
            v = data.get(key_env)
            if v:
                return v.strip(), source, path

    return None, None, default_env


def _auth_set_cmd(provider):
    return "jev auth set" if provider == DEFAULT_PROVIDER else f"jev auth set --provider {provider}"


def resolve_api_key(provider):
    key, _source, _path = locate_api_key(provider)
    if key:
        return key
    info = PROVIDERS[provider]
    raise JevError(
        f"jev: 未找到 {info['key_env']}。请设置环境变量，或在 $JEV_ENV_FILE 指向的文件"
        f"或 {default_env_path()} 中配置（配置目录可用 XDG_CONFIG_HOME 覆盖）。"
        f"在你自己的终端运行 {_auth_set_cmd(provider)} 可以交互式配置，密钥不会经过聊天或命令行参数。",
        2,
    )


def resolve_provider_name(explicit=None):
    """返回 (provider, reason)。reason ∈ {"--provider","JEV_PROVIDER","config.ini","auto"}。

    优先级：--provider → 环境变量 JEV_PROVIDER → config.ini 里 [jev] provider →
    自动检测（有 TypeSafe key 用 typesafe，否则有 OpenRouter key 用 openrouter，
    都没有则报错）。显式选择的 provider 即使没有对应 key 也不会在这里报错——
    缺 key 的报错由 resolve_api_key 给出，会点名具体是哪个 provider。

    注意：JEV_PROVIDER 只认环境变量，不会去 <config dir>/.env 里找同名的一行——
    .env 只放密钥，非密钥设置一律进 config.ini（`jev provider default` 写它）。"""
    if explicit:
        return explicit, "--provider"

    env_val = os.environ.get("JEV_PROVIDER")
    if env_val:
        if env_val not in PROVIDERS:
            raise JevError(
                f"jev: JEV_PROVIDER 值无效: {env_val}（可选 {'/'.join(PROVIDERS)}）", 2
            )
        return env_val, "JEV_PROVIDER"

    pinned = read_pinned_provider()
    if pinned:
        if pinned not in PROVIDERS:
            raise JevError(
                f"jev: {config_ini_path()} 中的 provider 值无效: {pinned}"
                f"（可选 {'/'.join(PROVIDERS)}）", 2
            )
        return pinned, "config.ini"

    ts_key, _, _ = locate_api_key("typesafe")
    if ts_key:
        return "typesafe", "auto"
    or_key, _, _ = locate_api_key("openrouter")
    if or_key:
        return "openrouter", "auto"

    raise JevError(
        "jev: 未找到任何 API key。请设置 TYPESAFE_API_KEY（默认后端，运行 jev auth set 配置）"
        "或 OPENROUTER_API_KEY（运行 jev auth set --provider openrouter 配置）。",
        2,
    )


def resolve_auth_provider(explicit):
    """`auth set` 专用：不做按 key 是否存在的自动检测（本来就是来配置 key 的），
    默认落到 typesafe。优先级：--provider → JEV_PROVIDER → typesafe。"""
    if explicit:
        return explicit
    env_val = os.environ.get("JEV_PROVIDER")
    if env_val:
        if env_val not in PROVIDERS:
            raise JevError(
                f"jev: JEV_PROVIDER 值无效: {env_val}（可选 {'/'.join(PROVIDERS)}）", 2
            )
        return env_val
    return DEFAULT_PROVIDER


_VERSIONED_SHORT_RE = re.compile(r"^jev-\d+\.\d+$")
_VERSIONED_LONG_RE = re.compile(r"^jev-(\d+\.\d+)\.0$")


def normalize_model(model, provider):
    """把可移植的别名/版本号换成目标 provider 认识的形式；不认识的字符串原样放行。

    实测确认：原生 API 只接受 jev-latest / jev-preview / jev-1.13.0 这类三段式版本号
    （jev-1.13 会被拒为 Unknown model）；OpenRouter 的版本化 ID 是 typesafe/jev-1.13
    （两段式，无 patch）。jev-latest 两边都有；jev-preview 只有原生 API 有（实测
    OpenRouter 返回 Model ~typesafe/jev-preview does not exist，照常透传让它明确
    报错，不悄悄换成 latest）。版本号形式不通用，这里按已知的
    `jev-X.Y` <-> `jev-X.Y.0` 规律做映射；其它写法原样放行，报错时提示
    `jev auth check` 查看账号可用的模型名。"""
    if provider == "typesafe":
        m = model
        if m.startswith("~"):
            m = m[1:]
        if m.startswith("typesafe/"):
            m = m[len("typesafe/"):]
        if _VERSIONED_SHORT_RE.match(m):
            m = f"{m}.0"
        return m
    # openrouter
    if "/" in model:
        return model
    if model in ("jev-latest", "jev-preview"):
        return f"~typesafe/{model}"
    m = _VERSIONED_LONG_RE.match(model)
    if m:
        return f"typesafe/jev-{m.group(1)}"
    return f"typesafe/{model}"


def resolve_model(model_arg, provider, spec_model=None):
    raw = model_arg or spec_model or os.environ.get("JEV_MODEL") or PROVIDERS[provider]["default_model"]
    return normalize_model(raw, provider)


def resolve_base_url(provider):
    return os.environ.get("JEV_BASE_URL") or PROVIDERS[provider]["base_url"]


def resolve_key_url(provider):
    return os.environ.get("JEV_KEY_URL") or PROVIDERS[provider]["key_url"]


def provider_headers(provider, api_key, content_type=False):
    headers = {"Authorization": f"Bearer {api_key}", "User-Agent": USER_AGENT}
    if content_type:
        headers["Content-Type"] = "application/json"
    headers.update(PROVIDERS[provider]["extra_headers"])
    return headers


# --------------------------------------------------------------------------
# HTTP + 连接复用 + 重试
# --------------------------------------------------------------------------
#
# 决策请求 (POST) 走这里的连接池：每个 (线程, scheme, host, port) 一条 http.client
# 连接，线程本地存储，跨请求复用。`auth check` 的 GET 调用量小，留在 urllib 上。

_conn_local = threading.local()
_conn_registry_lock = threading.Lock()
_conn_registry = []  # 所有线程各自的连接池 dict；逐行模式跑完后统一关闭用

_conn_stats_lock = threading.Lock()
_conn_stats = {"new": 0, "reused": 0}

# 复用连接上遇到这些错误，且是在拿到任何响应字节之前失败的，说明连接已经失效（比如
# 服务端悄悄断开了空闲连接），不算真正的网络故障：丢弃后立刻用新连接重试一次，不占
# --retries 名额、不 backoff（decision POST 没有副作用，重放是安全的）。
_STALE_CONN_ERRNOS = {errno.EPIPE, errno.ECONNRESET}


def _record_conn_stat(is_new):
    with _conn_stats_lock:
        _conn_stats["new" if is_new else "reused"] += 1


def get_conn_stats():
    with _conn_stats_lock:
        return dict(_conn_stats)


def _conn_pool():
    pool = getattr(_conn_local, "pool", None)
    if pool is None:
        pool = {}
        _conn_local.pool = pool
        with _conn_registry_lock:
            _conn_registry.append(pool)
    return pool


def close_all_connections():
    """尽力关闭所有线程的连接池，供逐行模式正常跑完后调用清理 fd。只做
    best-effort：关闭失败忽略，从不因为这一步耗时而拖住退出——Ctrl-C 走
    os._exit(130)，根本不会执行到这里，不受影响。"""
    with _conn_registry_lock:
        pools = list(_conn_registry)
    for pool in pools:
        for key in list(pool.keys()):
            conn = pool.pop(key, None)
            if conn is None:
                continue
            try:
                conn.close()
            except Exception:
                pass


def _is_loopback_host(host):
    h = (host or "").strip("[]")
    if h.lower() == "localhost":
        return True
    try:
        return ipaddress.ip_address(h).is_loopback
    except ValueError:
        return False


def resolve_proxy(scheme, host):
    """沿用系统/环境的网络设置，和 urllib 的行为一致；返回 (host, port, user,
    password) 或 None（直连）。"""
    if _is_loopback_host(host) or urllib.request.proxy_bypass(host):
        return None
    proxy_url = urllib.request.getproxies().get(scheme)
    if not proxy_url:
        return None
    p = urlparse(proxy_url)
    if p.scheme != "http" or not p.hostname:
        return None
    return p.hostname, p.port or 80, p.username, p.password


def _basic_auth_header(user, password):
    token = base64.b64encode(f"{user}:{password or ''}".encode("utf-8")).decode("ascii")
    return f"Basic {token}"


def _parse_target(url):
    parsed = urlparse(url)
    scheme = parsed.scheme
    host = parsed.hostname
    if not host or scheme not in ("http", "https"):
        raise JevError(f"jev: URL 无效: {url}", 2)
    port = parsed.port or (443 if scheme == "https" else 80)
    path = parsed.path or "/"
    if parsed.query:
        path += "?" + parsed.query
    return scheme, host, port, path


def _new_connection(scheme, host, port, timeout, proxy):
    if scheme != "https":
        return http.client.HTTPConnection(host, port, timeout=timeout)
    ctx = ssl.create_default_context()
    if proxy is None:
        return http.client.HTTPSConnection(host, port, timeout=timeout, context=ctx)
    p_host, p_port, p_user, p_pass = proxy
    conn = http.client.HTTPSConnection(p_host, p_port, timeout=timeout, context=ctx)
    tunnel_headers = {"Proxy-Authorization": _basic_auth_header(p_user, p_pass)} if p_user else None
    conn.set_tunnel(host, port, headers=tunnel_headers)
    return conn


def _is_stale_conn_error(e):
    if isinstance(
        e,
        (
            http.client.RemoteDisconnected,
            ConnectionResetError,
            BrokenPipeError,
            ssl.SSLEOFError,
            http.client.CannotSendRequest,
        ),
    ):
        return True
    return isinstance(e, OSError) and getattr(e, "errno", None) in _STALE_CONN_ERRNOS


def _should_close_after(resp):
    conn_header = (resp.headers.get("Connection") or "").lower()
    if "close" in conn_header:
        return True
    return resp.version == 10 and "keep-alive" not in conn_header


def http_post(url, headers, payload, timeout, debug=False):
    data = json.dumps(payload).encode("utf-8")
    scheme, host, port, path = _parse_target(url)
    proxy = resolve_proxy(scheme, host)
    pool = _conn_pool()
    key = (scheme, host, port, proxy)

    conn = pool.get(key)
    is_new = conn is None
    if is_new:
        conn = _new_connection(scheme, host, port, timeout, proxy)

    if debug:
        print(f"[jev][debug] connection: {'new' if is_new else 'reused'}", file=sys.stderr)
    _record_conn_stat(is_new)

    req_headers = dict(headers)
    req_headers["Content-Length"] = str(len(data))
    try:
        conn.request("POST", path, body=data, headers=req_headers)
        resp = conn.getresponse()
    except Exception as e:
        if not is_new and _is_stale_conn_error(e):
            try:
                conn.close()
            except Exception:
                pass
            pool.pop(key, None)
            conn = _new_connection(scheme, host, port, timeout, proxy)
            if debug:
                print("[jev][debug] connection: new (上一条复用连接已失效，重试一次)", file=sys.stderr)
            _record_conn_stat(True)
            try:
                conn.request("POST", path, body=data, headers=req_headers)
                resp = conn.getresponse()
            except Exception as e2:
                try:
                    conn.close()
                except Exception:
                    pass
                raise JevNetworkError(str(e2))
        else:
            try:
                conn.close()
            except Exception:
                pass
            pool.pop(key, None)
            raise JevNetworkError(str(e))

    try:
        body_bytes = resp.read()
    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        pool.pop(key, None)
        raise JevNetworkError(str(e))

    if _should_close_after(resp):
        try:
            conn.close()
        except Exception:
            pass
        pool.pop(key, None)
    else:
        pool[key] = conn

    return resp.status, body_bytes.decode("utf-8", "replace"), resp.headers


def http_get(url, headers, timeout):
    """`auth check` 专用：一次性 GET，不重试（这一路径不计费，出错直接报告）。"""
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.getcode(), resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8", "replace")
        finally:
            e.close()
        return e.code, body
    except (urllib.error.URLError, socket.timeout, OSError) as e:
        reason = getattr(e, "reason", e)
        raise JevNetworkError(str(reason))


def backoff_delay(attempt, retry_after=None):
    if retry_after:
        try:
            return float(retry_after)
        except (TypeError, ValueError):
            pass
    delay = min(20.0, 0.5 * (2 ** (attempt - 1)))
    return delay + random.uniform(0, delay * 0.5)


def _format_detail(detail):
    """格式化 TypeSafe 原生错误的顶层 detail：dict 取 message，FastAPI 风格的
    issue 列表拼成 `loc: msg`（用 `; ` 连接），字符串原样返回。三种形状均已用真实
    账号实测确认：422 缺字段是 issue 列表（额外带 type/input，这里只取 loc/msg）；
    400（未知问题类型、未知模型）是带 error_type/message 的对象；400（等级数超限）
    是纯字符串。"""
    if isinstance(detail, dict):
        msg = detail.get("message")
        if msg is not None:
            return str(msg)
        return json.dumps(detail, ensure_ascii=False)
    if isinstance(detail, list):
        parts = []
        for issue in detail:
            if isinstance(issue, dict) and ("loc" in issue or "msg" in issue):
                loc = issue.get("loc")
                loc_str = ".".join(str(p) for p in loc) if isinstance(loc, list) else (str(loc) if loc else "")
                msg = issue.get("msg", "")
                parts.append(f"{loc_str}: {msg}" if loc_str else str(msg))
            else:
                parts.append(str(issue))
        return "; ".join(parts)
    return str(detail)


def format_api_error(status, body, provider=None):
    parsed = None
    try:
        parsed = json.loads(body)
    except Exception:
        parsed = None

    inner = None
    unknown_model = False
    if isinstance(parsed, dict) and "detail" in parsed:
        # TypeSafe 原生错误：顶层就是 {"detail": ...}。
        detail = parsed["detail"]
        inner = _format_detail(detail)
        if isinstance(detail, dict) and str(detail.get("message") or "").startswith("Unknown model"):
            unknown_model = True
    else:
        message = None
        if isinstance(parsed, dict):
            err = parsed.get("error")
            if isinstance(err, dict):
                message = err.get("message")
            elif isinstance(err, str):
                message = err
        if message is None:
            message = body.strip() or f"HTTP {status}"

        if isinstance(message, str) and message.strip().startswith("["):
            try:
                issues = json.loads(message)
                if isinstance(issues, list) and issues and isinstance(issues[0], dict):
                    parts = []
                    for issue in issues:
                        path = issue.get("path")
                        path_str = ".".join(str(p) for p in path) if isinstance(path, list) else ""
                        msg = issue.get("message", "")
                        parts.append(f"{path_str}: {msg}" if path_str else str(msg))
                    inner = "; ".join(parts)
            except Exception:
                inner = None

        if inner is None and isinstance(message, str) and message.startswith("HTTP "):
            m = re.match(r"HTTP\s+\d+:\s*(.*)", message, re.DOTALL)
            rest = m.group(1) if m else message
            try:
                j = json.loads(rest)
                if isinstance(j, dict) and "detail" in j:
                    inner = _format_detail(j["detail"])
                else:
                    inner = rest
            except Exception:
                inner = rest

        if inner is None:
            inner = message if isinstance(message, str) else json.dumps(message, ensure_ascii=False)

    text = f"jev: API 错误 (HTTP {status}): {inner}"
    if provider == "typesafe" and status in (401, 403):
        text += "\njev: 提示：请在你自己的终端运行 jev auth set"
    elif provider == "openrouter" and status == 401:
        text += "\njev: 提示：请检查 OPENROUTER_API_KEY 是否正确，或运行 jev auth set --provider openrouter 重新设置。"
    elif unknown_model:
        text += "\njev: 提示：运行 jev auth check 查看这个账号可用的模型名"
    return text


class Ctx:
    def __init__(self, args, spec_model=None):
        provider, reason = resolve_provider_name(getattr(args, "provider", None))
        self.provider = provider
        self.provider_reason = reason
        self.model = resolve_model(getattr(args, "model", None), provider, spec_model)
        self.base_url = resolve_base_url(provider)
        self.api_key = resolve_api_key(provider)
        self.timeout = args.timeout
        self.retries = args.retries
        self.debug = os.environ.get("JEV_DEBUG") == "1"
        self.verbose = getattr(args, "verbose", False)


def call_api_payload(ctx, payload):
    headers = provider_headers(ctx.provider, ctx.api_key, content_type=True)
    if ctx.debug:
        try:
            print("[jev][debug] request: " + json.dumps(payload, ensure_ascii=False), file=sys.stderr)
        except Exception:
            pass

    attempt = 0
    while True:
        attempt += 1
        try:
            status, body, hdrs = http_post(ctx.base_url, headers, payload, ctx.timeout, debug=ctx.debug)
        except JevNetworkError as e:
            if attempt > ctx.retries:
                raise JevError(f"jev: 网络错误: {e}", 2)
            time.sleep(backoff_delay(attempt))
            continue

        if status == 200:
            try:
                return json.loads(body)
            except json.JSONDecodeError:
                raise JevError("jev: 响应不是合法 JSON", 2)

        if status in (429, 529) or 500 <= status < 600:
            if attempt > ctx.retries:
                raise JevError(format_api_error(status, body, provider=ctx.provider), 2)
            retry_after = hdrs.get("Retry-After") if hdrs is not None else None
            time.sleep(backoff_delay(attempt, retry_after))
            continue

        raise JevError(format_api_error(status, body, provider=ctx.provider), 2)


def call_api(ctx, state, questions):
    return call_api_payload(ctx, {"model": ctx.model, "state": state, "questions": questions})


def estimate_cost(provider, input_tokens):
    price = PROVIDERS[provider]["price_per_mtok"]
    if not price:
        return None
    return input_tokens * price / 1e6


def format_verbose(ctx, resp, elapsed, conf=None):
    usage = resp.get("usage") or {}
    input_tok = usage.get("input_tokens") or 0
    output_tok = usage.get("output_tokens") or 0
    tok = input_tok + output_tok
    actual_cost = usage.get("cost")
    if actual_cost is not None:
        cost_str = f"${actual_cost:.6f}"
    else:
        cost_str = f"≈${(estimate_cost(ctx.provider, input_tok) or 0):.6f}"
    s = f"[jev] {ctx.provider} · {resp.get('model')} · {elapsed:.2f}s · {tok} tok · {cost_str}"
    if conf is not None:
        s += f" · conf={conf:.2f}"
    return s


# --------------------------------------------------------------------------
# 状态 (state) 解析
# --------------------------------------------------------------------------

def estimate_tokens(text):
    ascii_chars = sum(1 for c in text if ord(c) < 128)
    non_ascii = len(text) - ascii_chars
    return ascii_chars / 4 + non_ascii


def size_guard(state, questions):
    state_text = state if isinstance(state, str) else json.dumps(state, ensure_ascii=False)
    state_tokens = estimate_tokens(state_text)
    longest_q = 0
    for q in questions.values():
        t = estimate_tokens(json.dumps(q, ensure_ascii=False))
        if t > longest_q:
            longest_q = t
    total = state_tokens + longest_q
    if total > SIZE_WARN_TOKENS:
        print(f"[jev] 警告: 预估 token 数约 {int(total)}，可能超出模型上下文限制 (~32K)", file=sys.stderr)


def _maybe_parse_json_state(text):
    stripped = text.strip()
    if stripped[:1] not in ("{", "["):
        return None
    try:
        val = json.loads(stripped)
    except json.JSONDecodeError:
        return None
    if isinstance(val, (dict, list)):
        return val
    return None


def read_state_source(args):
    if args.state is None:
        if sys.stdin.isatty():
            raise JevError(
                "jev: 未提供状态。请使用 -s/--state 传入，或通过管道输入 (当前 stdin 是终端)。", 2
            )
        return sys.stdin.read()
    if args.state == "-":
        return sys.stdin.read()
    if args.state.startswith("@"):
        path = args.state[1:]
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        except OSError as e:
            raise JevError(f"jev: 无法读取文件 {path}: {e}", 2)
    return args.state


def resolve_state(args):
    raw = read_state_source(args)
    if raw.strip() == "":
        raise JevError("jev: 状态为空。", 2)
    if not args.text:
        parsed = _maybe_parse_json_state(raw)
        if parsed is not None:
            return parsed
    return raw.strip()


def _iter_raw_lines(args):
    """惰性产出非空行（已去掉行尾换行符），不会把整个输入读入内存——
    stdin/@文件都是边读边吐，这样 `tail -f x | jev filter ...` 才能实时出结果。"""
    if args.state is None or args.state == "-":
        for raw in iter(sys.stdin.readline, ""):
            line = raw.rstrip("\n")
            if line.strip() != "":
                yield line
    elif args.state.startswith("@"):
        path = args.state[1:]
        try:
            fh = open(path, "r", encoding="utf-8")
        except OSError as e:
            raise JevError(f"jev: 无法读取文件 {path}: {e}", 2)
        try:
            for raw in fh:
                line = raw.rstrip("\n")
                if line.strip() != "":
                    yield line
        finally:
            fh.close()
    else:
        for raw in args.state.split("\n"):
            if raw.strip() != "":
                yield raw


def _coerce_field_value(value):
    """--field 取出的值若不是 str/dict/list（number/bool/null），转成字符串再发送，
    避免原样发给 API 时因为 state 类型不对触发 400。"""
    if isinstance(value, (str, dict, list)):
        return value
    if isinstance(value, bool) or value is None:
        return json.dumps(value)
    return str(value)


def resolve_line_state(raw_line, args):
    parsed = None
    parsed_ok = False
    if args.field or not args.text:
        try:
            parsed = json.loads(raw_line)
            parsed_ok = True
        except json.JSONDecodeError:
            parsed_ok = False

    if args.field:
        if parsed_ok and isinstance(parsed, dict):
            if args.field not in parsed:
                raise JevError(f"jev: 字段 {args.field} 不存在于该行 JSON 中", 2)
            return _coerce_field_value(parsed[args.field])
        # 不是 JSON 对象，落到下面的通用规则

    if not args.text and parsed_ok and isinstance(parsed, (dict, list)):
        return parsed
    return raw_line


# --------------------------------------------------------------------------
# 答案增强 / 展示辅助
# --------------------------------------------------------------------------

def enrich_answer(answer, threshold=0.5, range_offset=None):
    answer = dict(answer)
    qtype = answer.get("type")
    if qtype == "noul":
        answer["yes"] = answer.get("noul", 0) >= threshold
    elif qtype == "score":
        answer["label"] = score_label(answer)
        if range_offset is not None:
            answer["value"] = range_offset + answer.get("score", 0)
    return answer


def score_label(answer):
    legend = answer.get("legend") or {}
    probs = answer.get("probabilities") or {}
    if not probs:
        return ""
    argmax_key = max(probs, key=lambda k: probs[k])
    return legend.get(argmax_key, "")


def score_value(answer, range_offset):
    v = answer.get("score", 0)
    if range_offset is not None:
        v = v + range_offset
    return v


# --------------------------------------------------------------------------
# spec (run) 加载
# --------------------------------------------------------------------------

def script_dir():
    return os.path.dirname(os.path.realpath(__file__))


def discover_specs():
    # 用户目录优先；内置模板在 skill 根目录的 specs/（脚本位于 scripts/ 下）
    user_specs_dir = os.path.join(config_dir(), "specs")
    dirs = [
        user_specs_dir,
        os.path.join(script_dir(), "specs"),
        os.path.join(os.path.dirname(script_dir()), "specs"),
    ]
    result = {}
    for d in dirs:
        if not os.path.isdir(d):
            continue
        entries = {}
        try:
            for fname in os.listdir(d):
                base, ext = os.path.splitext(fname)
                if ext in (".toml", ".json"):
                    entries.setdefault(base, {})[ext] = os.path.join(d, fname)
        except OSError:
            continue
        for base in sorted(entries):
            if base in result:
                continue
            paths = entries[base]
            if tomllib is None:
                # 没有 tomllib（Python < 3.11）时优先用 JSON，同名 TOML 会解析失败。
                result[base] = paths.get(".json") or paths.get(".toml")
            else:
                result[base] = paths.get(".toml") or paths.get(".json")
    return result


def find_spec_path(spec_arg):
    if os.path.isfile(spec_arg):
        return spec_arg
    if os.sep in spec_arg:
        raise JevError(f"jev: 找不到 spec 文件: {spec_arg}", 2)
    specs = discover_specs()
    if spec_arg in specs:
        return specs[spec_arg]
    user_specs_dir = os.path.join(config_dir(), "specs")
    raise JevError(
        f"jev: 未找到名为 {spec_arg} 的 spec (已搜索 {user_specs_dir} 与内置 specs 目录)", 2
    )


def load_spec(path):
    ext = os.path.splitext(path)[1].lower()
    try:
        if ext == ".toml":
            if tomllib is None:
                raise JevError(
                    "jev: 当前 Python 版本不支持 TOML (需要 3.11+)。"
                    "请使用 JSON 格式的 spec，或升级 Python。",
                    2,
                )
            with open(path, "rb") as f:
                data = tomllib.load(f)
        elif ext == ".json":
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            raise JevError(f"jev: 不支持的 spec 格式: {path}", 2)
    except JevError:
        raise
    except OSError as e:
        raise JevError(f"jev: 无法读取 spec 文件 {path}: {e}", 2)
    except Exception as e:
        raise JevError(f"jev: spec 文件解析失败 {path}: {e}", 2)
    validate_spec(data, path)
    return data


def validate_spec(data, path):
    if not isinstance(data, dict) or not isinstance(data.get("questions"), dict) or not data.get("questions"):
        raise JevError(f"jev: spec 格式错误 {path}: 缺少 [questions.*] 定义", 2)
    for name, q in data["questions"].items():
        if not isinstance(q, dict):
            raise JevError(f"jev: spec 格式错误 {path}: questions.{name} 不是对象", 2)
        qtype = q.get("type")
        if qtype not in ("choice", "score", "noul"):
            raise JevError(f"jev: spec 格式错误 {path}: questions.{name}.type 必须是 choice/score/noul", 2)
        if not q.get("instructions"):
            raise JevError(f"jev: spec 格式错误 {path}: questions.{name} 缺少 instructions", 2)
        # 只有 type / instructions / criteria 会发给 API；其余字段报错，不能静默丢弃
        extra = sorted(set(q) - {"type", "instructions", "criteria"})
        if extra:
            hint = ""
            if qtype == "noul" and {"true", "false"} & set(extra):
                hint = f"；是非题两端的描述写在 criteria 里：[questions.{name}.criteria] true = \"…\" false = \"…\""
            raise JevError(
                f"jev: spec 格式错误 {path}: questions.{name} 含未知字段 {', '.join(extra)}"
                f"（只支持 type / instructions / criteria）{hint}",
                2,
            )
        if qtype == "choice":
            crit = q.get("criteria")
            if not isinstance(crit, dict) or len(crit) < 2:
                raise JevError(f"jev: spec 格式错误 {path}: questions.{name}.criteria 至少需要两个选项", 2)
        elif qtype == "score":
            crit = q.get("criteria")
            if not isinstance(crit, list):
                raise JevError(
                    f"jev: spec 格式错误 {path}: questions.{name}.criteria 必须是数组，按从低到高列出各等级，"
                    '例如 ["低", "中", "高"]（choice 和 noul 才用 {名称: 描述} 的写法）', 2
                )
            if not (2 <= len(crit) <= 10):
                raise JevError(f"jev: spec 格式错误 {path}: questions.{name}.criteria 需要 2-10 个等级", 2)
        elif qtype == "noul":
            crit = q.get("criteria")
            # API 要求 noul 的 criteria 一旦出现就必须同时有 true/false 两个键
            if crit is not None and (not isinstance(crit, dict) or not {"true", "false"} <= set(crit)):
                raise JevError(
                    f"jev: spec 格式错误 {path}: questions.{name}.criteria 必须是同时包含 true 和 false 的对象", 2
                )
    threshold = data.get("threshold")
    if threshold is not None:
        try:
            float(threshold)
        except (TypeError, ValueError):
            raise JevError(f"jev: spec 格式错误 {path}: threshold 必须是数字", 2)


def spec_questions_payload(spec):
    out = {}
    for name, q in spec["questions"].items():
        out[name] = {k: v for k, v in q.items() if k in ("type", "instructions", "criteria")}
    return out


def display_width(s):
    """东亚宽字符（中日韩文字等）按 2 列算，其余按 1 列算，用于对齐表格。"""
    w = 0
    for ch in s:
        w += 2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1
    return w


def pad_display(s, width):
    return s + " " * max(0, width - display_width(s))


def render_run_table(spec, answers, threshold):
    rows = []
    for name in spec["questions"]:
        answer = answers.get(name, {})
        qtype = answer.get("type")
        if qtype == "choice":
            value = answer.get("choice", "")
            prob = (answer.get("probabilities") or {}).get(value, 0)
            stats = f"p={prob:.2f} conf={answer.get('confidence', 0):.2f}"
        elif qtype == "score":
            legend = answer.get("legend") or {}
            max_idx = len(legend) - 1 if legend else 0
            stats = f"score={answer.get('score', 0):.2f}/{max_idx} conf={answer.get('confidence', 0):.2f}"
            value = score_label(answer)
        elif qtype == "noul":
            p = answer.get("noul", 0)
            value = "yes" if p >= threshold else "no"
            stats = f"p={p:.2f}"
        else:
            value, stats = "", ""
        rows.append((name, value, stats))
    name_w = max((display_width(r[0]) for r in rows), default=0)
    value_w = max((display_width(r[1]) for r in rows), default=0)
    return "\n".join(f"{pad_display(n, name_w)}  {pad_display(v, value_w)}  {s}" for n, v, s in rows)


# --------------------------------------------------------------------------
# 逐行模式驱动
# --------------------------------------------------------------------------

def _new_line_stats():
    return {"calls": 0, "failures": 0, "tokens": 0, "cost": 0.0}


def _print_line_summary(args, ctx, stats, t_start):
    if not args.verbose:
        return
    wall = time.time() - t_start
    prefix = "≈" if PROVIDERS[ctx.provider]["price_per_mtok"] else ""
    conn = get_conn_stats()
    print(
        f"[jev] {ctx.provider} · 共 {stats['calls']} 次调用 · 失败 {stats['failures']} 次 · "
        f"{stats['tokens']} tok · {prefix}${stats['cost']:.6f} · 耗时 {wall:.2f}s · "
        f"连接 新建 {conn['new']} / 复用 {conn['reused']}",
        file=sys.stderr,
    )


def _call_line(ctx, questions, raw_line, args):
    try:
        state = resolve_line_state(raw_line, args)
        size_guard(state, questions)
        resp = call_api(ctx, state, questions)
        return (state, resp, None)
    except JevError as e:
        return (None, None, str(e))


def iter_line_results(args, ctx, questions, stats):
    """逐行模式的唯一驱动：惰性读输入、维持最多 jobs*2 个并发请求在途、按输入顺序
    产出 (idx, raw_line, state, resp, err)。

    读行和等待结果分别跑在两个线程上（一个后台 reader 线程 + 主线程消费），这样
    像 `tail -f` 这种“下一行还没到”的慢输入不会卡住已经算完、可以立刻打印的结果——
    否则如果在主线程里先攒够 jobs*2 个再开始等结果，读下一行的阻塞会拖住已经就绪
    的输出，逐行模式就不是真正的流式了。

    stats 会被原地累加 calls/failures/tokens/cost，供 --verbose 汇总使用。
    收到 KeyboardInterrupt 时取消尚未开始的请求并立刻重新抛出，避免 Ctrl-C 卡住等
    全部排队的请求跑完。
    """
    if args.state is None and sys.stdin.isatty():
        raise JevError(
            "jev: 未提供输入。请使用 -s/--state 传入，或通过管道输入 (当前 stdin 是终端)。", 2
        )

    workers = max(1, args.jobs)
    max_inflight = workers * 2
    ex = ThreadPoolExecutor(max_workers=workers)
    q = queue.Queue(maxsize=max_inflight)
    reader_errors = []
    stop = threading.Event()

    def reader():
        try:
            for idx, raw_line in enumerate(_iter_raw_lines(args)):
                if stop.is_set():
                    return
                try:
                    fut = ex.submit(_call_line, ctx, questions, raw_line, args)
                except RuntimeError:  # executor 已关闭（Ctrl-C / 下游提前关闭管道）
                    return
                q.put((idx, raw_line, fut))
        except JevError as e:
            reader_errors.append(e)
        except Exception as e:  # 例如非 UTF-8 输入；不能让输出被截断却 exit 0
            reader_errors.append(JevError(f"jev: 读取输入失败: {e}", 2))
        finally:
            q.put(None)  # 哨兵：输入结束

    reader_thread = threading.Thread(target=reader, daemon=True)
    reader_thread.start()

    try:
        while True:
            item = q.get()
            if item is None:
                break
            idx, raw_line, fut = item
            state, resp, err = fut.result()
            stats["calls"] += 1
            if err is not None:
                stats["failures"] += 1
            elif resp is not None:
                usage = resp.get("usage") or {}
                input_tok = usage.get("input_tokens") or 0
                output_tok = usage.get("output_tokens") or 0
                stats["tokens"] += input_tok + output_tok
                actual_cost = usage.get("cost")
                if actual_cost is not None:
                    stats["cost"] += actual_cost
                else:
                    stats["cost"] += estimate_cost(ctx.provider, input_tok) or 0
            yield (idx, raw_line, state, resp, err)
        if reader_errors:
            raise reader_errors[0]
    except BaseException:
        stop.set()
        ex.shutdown(wait=False, cancel_futures=True)
        raise
    else:
        ex.shutdown(wait=True)
        try:
            close_all_connections()
        except Exception:
            pass


def run_line_mode(args, ctx, questions, value_fn, json_enrich):
    """单问题逐行模式，供 yes/pick/score 使用；只负责按各自的格式渲染一行。"""
    stats = _new_line_stats()
    t_start = time.time()
    had_error = False

    for idx, raw_line, state, resp, err in iter_line_results(args, ctx, questions, stats):
        if err is not None:
            had_error = True
            print(f"jev: 第 {idx + 1} 行失败: {err}", file=sys.stderr)
            if args.json:
                print(json.dumps({"input": raw_line, "error": err}, ensure_ascii=False))
                sys.stdout.flush()
            continue
        answer = resp["answers"]["answer"]
        if args.json:
            out = {"input": state, "answer": json_enrich(answer)}
            print(json.dumps(out, ensure_ascii=False))
        else:
            answer_str, number = value_fn(answer)
            print(f"{answer_str}\t{number:.2f}\t{raw_line}")
        sys.stdout.flush()

    _print_line_summary(args, ctx, stats, t_start)
    return 2 if had_error else 0


def run_line_mode_multi(args, ctx, questions, value_fn, threshold):
    """多问题逐行模式，供 run 使用；只负责按各自的格式渲染一行。"""
    stats = _new_line_stats()
    t_start = time.time()
    had_error = False

    for idx, raw_line, state, resp, err in iter_line_results(args, ctx, questions, stats):
        if err is not None:
            had_error = True
            print(f"jev: 第 {idx + 1} 行失败: {err}", file=sys.stderr)
            if args.json:
                print(json.dumps({"input": raw_line, "error": err}, ensure_ascii=False))
                sys.stdout.flush()
            continue
        answers = resp.get("answers", {})
        if args.json:
            enriched = {n: enrich_answer(a, threshold=threshold) for n, a in answers.items()}
            print(json.dumps({"input": state, "answers": enriched}, ensure_ascii=False))
        else:
            print(f"{value_fn(answers)}\t{raw_line}")
        sys.stdout.flush()

    _print_line_summary(args, ctx, stats, t_start)
    return 2 if had_error else 0


# --------------------------------------------------------------------------
# 子命令
# --------------------------------------------------------------------------

def single_call(args, questions, spec_model=None, conf_from=None):
    """单次（非逐行）调用的共用路径：resolve_state → size_guard → Ctx → call_api
    → 计时 → --verbose 打印，供 yes/pick/score/run 复用。返回 (ctx, state, resp, elapsed)。

    spec_model 是 spec 里写的 model（如果有），按 -m → spec model → JEV_MODEL →
    provider 默认值的顺序参与解析，并按目标 provider 归一化。

    conf_from(resp) 可选，用来从响应里取出 confidence 传给 --verbose 的 conf= 部分
    （pick/score 需要，yes/run 不需要）。"""
    state = resolve_state(args)
    size_guard(state, questions)
    ctx = Ctx(args, spec_model=spec_model)
    t0 = time.time()
    resp = call_api(ctx, state, questions)
    elapsed = time.time() - t0
    if ctx.verbose:
        conf = conf_from(resp) if conf_from else None
        print(format_verbose(ctx, resp, elapsed, conf), file=sys.stderr)
    return ctx, state, resp, elapsed


def build_noul_question(question_text, true_desc, false_desc):
    """构造 noul 类型的 question 对象。API 那边 criteria 只要出现就必须同时有
    true/false 两个键（缺一个会 400），所以只给了 --true 或只给了 --false 时，
    另一半要补成空字符串，不能只发一半。"""
    question_obj = {"type": "noul", "instructions": question_text}
    if true_desc is not None or false_desc is not None:
        question_obj["criteria"] = {
            "true": true_desc if true_desc is not None else "",
            "false": false_desc if false_desc is not None else "",
        }
    return question_obj


def cmd_yes(args):
    question_obj = build_noul_question(args.question, args.true_desc, args.false_desc)
    questions = {"answer": question_obj}

    if args.lines:
        ctx = Ctx(args)
        return run_line_mode(
            args, ctx, questions,
            value_fn=lambda ans: ("yes" if ans.get("noul", 0) >= args.threshold else "no", ans.get("noul", 0)),
            json_enrich=lambda ans: enrich_answer(ans, threshold=args.threshold),
        )

    ctx, state, resp, elapsed = single_call(args, questions)
    answer = resp["answers"]["answer"]
    p = answer.get("noul", 0)
    is_yes = p >= args.threshold
    if args.json:
        out = {
            "model": resp.get("model"), "id": resp.get("id"), "provider": ctx.provider,
            "answer": enrich_answer(answer, threshold=args.threshold), "usage": resp.get("usage"),
        }
        print(json.dumps(out, ensure_ascii=False))
    elif not args.quiet:
        print(f"{'yes' if is_yes else 'no'}\t{p:.2f}")
    return 0 if is_yes else 1


def parse_options(option_args):
    options = []
    seen = set()
    for raw in option_args:
        if "=" in raw:
            name, desc = raw.split("=", 1)
        else:
            name, desc = raw, ""
        name = name.strip()
        if not name:
            raise JevError("jev: 选项名不能为空", 2)
        if name in seen:
            raise JevError(f"jev: 选项名重复: {name}", 2)
        seen.add(name)
        options.append((name, desc))
    return options


def cmd_pick(args):
    options = parse_options(args.options)
    if len(options) < 2:
        raise JevError("jev: pick 至少需要两个选项", 2)
    if args.other:
        if any(n == "other" for n, _ in options):
            raise JevError("jev: 选项名重复: other", 2)
        options.append(("other", "以上选项都不符合"))
    criteria = {name: desc for name, desc in options}
    question_obj = {"type": "choice", "instructions": args.question, "criteria": criteria}
    questions = {"answer": question_obj}

    if args.lines:
        ctx = Ctx(args)
        return run_line_mode(
            args, ctx, questions,
            value_fn=lambda ans: (ans.get("choice", ""), (ans.get("probabilities") or {}).get(ans.get("choice", ""), 0)),
            json_enrich=lambda ans: ans,
        )

    ctx, state, resp, elapsed = single_call(
        args, questions, conf_from=lambda r: r["answers"]["answer"].get("confidence"))
    answer = resp["answers"]["answer"]

    exit_code = 0
    if args.min_confidence is not None and answer.get("confidence", 0) < args.min_confidence:
        exit_code = 1

    if args.json:
        out = {
            "model": resp.get("model"), "id": resp.get("id"), "provider": ctx.provider,
            "answer": answer, "usage": resp.get("usage"),
        }
        print(json.dumps(out, ensure_ascii=False))
    elif args.probs:
        probs = answer.get("probabilities") or {}
        for name, p in sorted(probs.items(), key=lambda kv: -kv[1]):
            print(f"{name}\t{p:.2f}")
    else:
        print(answer.get("choice", ""))
    return exit_code


def cmd_score(args):
    if args.range and args.labels:
        raise JevError("jev: LABEL 列表与 --range 不能同时使用", 2)
    if args.range:
        m = re.match(r"^(-?\d+)-(-?\d+)$", args.range)
        if not m:
            raise JevError("jev: --range 格式应为 A-B，例如 1-5", 2)
        a, b = int(m.group(1)), int(m.group(2))
        if b <= a:
            raise JevError("jev: --range 中 B 必须大于 A", 2)
        n = b - a + 1
        if not (2 <= n <= 10):
            raise JevError("jev: --range 生成的等级数需在 2-10 之间", 2)
        labels = [str(i) for i in range(a, b + 1)]
        range_offset = a
    else:
        labels = args.labels
        if not (2 <= len(labels) <= 10):
            raise JevError("jev: score 需要 2-10 个 LABEL (从低到高)，或使用 --range", 2)
        range_offset = None

    question_obj = {"type": "score", "instructions": args.question, "criteria": labels}
    questions = {"answer": question_obj}

    if args.lines:
        ctx = Ctx(args)
        return run_line_mode(
            args, ctx, questions,
            value_fn=lambda ans: (score_label(ans), score_value(ans, range_offset)),
            json_enrich=lambda ans: enrich_answer(ans, range_offset=range_offset),
        )

    ctx, state, resp, elapsed = single_call(
        args, questions, conf_from=lambda r: r["answers"]["answer"].get("confidence"))
    answer = resp["answers"]["answer"]

    if args.json:
        out = {
            "model": resp.get("model"), "id": resp.get("id"), "provider": ctx.provider,
            "answer": enrich_answer(answer, range_offset=range_offset), "usage": resp.get("usage"),
        }
        print(json.dumps(out, ensure_ascii=False))
    elif args.probs:
        legend = answer.get("legend") or {}
        probs = answer.get("probabilities") or {}
        for k in sorted(legend, key=lambda x: int(x)):
            print(f"{legend[k]}\t{probs.get(k, 0):.2f}")
    else:
        print(f"{score_value(answer, range_offset):.2f}\t{score_label(answer)}")
    return 0


def cmd_filter(args):
    question_obj = build_noul_question(args.question, args.true_desc, args.false_desc)
    questions = {"answer": question_obj}
    ctx = Ctx(args)
    stats = _new_line_stats()
    t_start = time.time()

    printed = 0
    errored = 0
    for idx, raw_line, state, resp, err in iter_line_results(args, ctx, questions, stats):
        if err is not None:
            errored += 1
            print(f"jev: 第 {idx + 1} 行失败: {err}", file=sys.stderr)
            if args.json:
                print(json.dumps({"input": raw_line, "error": err}, ensure_ascii=False))
                sys.stdout.flush()
            continue
        answer = resp["answers"]["answer"]
        p = answer.get("noul", 0)
        is_match = p >= args.threshold
        if args.invert:
            is_match = not is_match
        if is_match:
            printed += 1
            if args.json:
                print(json.dumps({"input": state, "prob": p, "line": raw_line}, ensure_ascii=False))
            elif args.with_prob:
                print(f"{p:.2f}\t{raw_line}")
            else:
                print(raw_line)
            sys.stdout.flush()

    _print_line_summary(args, ctx, stats, t_start)
    if errored:
        return 2
    return 0 if printed else 1


def cmd_run(args):
    if not args.spec:
        specs = discover_specs()
        if not specs:
            print("未找到任何 spec。", file=sys.stderr)
            return 0
        for name in sorted(specs):
            try:
                data = load_spec(specs[name])
                desc = data.get("description", "") if isinstance(data, dict) else ""
            except JevError:
                desc = "(解析失败)"
            print(f"{name}\t{desc}")
        return 0

    path = find_spec_path(args.spec)
    spec = load_spec(path)
    threshold = float(spec.get("threshold", 0.5))
    questions = spec_questions_payload(spec)

    if args.lines:
        ctx = Ctx(args, spec_model=spec.get("model"))

        def value_fn_run(answers):
            parts = []
            for name in spec["questions"]:
                ans = answers.get(name, {})
                qtype = ans.get("type")
                if qtype == "choice":
                    v = ans.get("choice", "")
                elif qtype == "score":
                    v = f"{score_value(ans, None):.2f}"
                elif qtype == "noul":
                    v = "yes" if ans.get("noul", 0) >= threshold else "no"
                else:
                    v = ""
                parts.append(f"{name}={v}")
            return " ".join(parts)

        return run_line_mode_multi(args, ctx, questions, value_fn_run, threshold)

    ctx, state, resp, elapsed = single_call(args, questions, spec_model=spec.get("model"))
    answers = resp.get("answers", {})

    if args.json:
        enriched = {n: enrich_answer(a, threshold=threshold) for n, a in answers.items()}
        out = {
            "model": resp.get("model"), "id": resp.get("id"), "provider": ctx.provider,
            "answers": enriched, "usage": resp.get("usage"),
        }
        print(json.dumps(out, ensure_ascii=False))
    else:
        print(render_run_table(spec, answers, threshold))
    return 0


def cmd_raw(args):
    """stdin 传入完整请求体，原样透传：不做 criteria 归一化，也不修改响应体，只在
    请求体缺 model 字段时用所选 provider 的默认模型补上——已有的 model 字段一律
    原样发送，不做别名归一化（发什么就是什么，用于调试或探索 typed 命令未覆盖的用法）。"""
    try:
        raw_in = sys.stdin.read()
    except Exception as e:
        raise JevError(f"jev: 读取 stdin 失败: {e}", 2)
    if not raw_in.strip():
        raise JevError("jev: raw 需要在 stdin 提供请求 JSON", 2)
    try:
        payload = json.loads(raw_in)
    except json.JSONDecodeError as e:
        raise JevError(f"jev: stdin 不是合法 JSON: {e}", 2)
    if not isinstance(payload, dict):
        raise JevError("jev: 请求体必须是 JSON 对象", 2)

    ctx = Ctx(args)
    if payload.get("model"):
        ctx.model = payload["model"]
    else:
        payload["model"] = ctx.model

    t0 = time.time()
    resp = call_api_payload(ctx, payload)
    elapsed = time.time() - t0
    if ctx.verbose:
        print(format_verbose(ctx, resp, elapsed), file=sys.stderr)
    print(json.dumps(resp, ensure_ascii=False))
    return 0


# --------------------------------------------------------------------------
# 密钥管理 (auth)
# --------------------------------------------------------------------------
#
# 目标：仓库既提供 CLI 安装，也提供一条让用户在自己终端里设置密钥的路径，密钥
# 全程不经过 AI agent —— 不进聊天、不进命令行参数、不进 shell 历史。`auth set`
# 因此拒绝在非交互终端下运行：agent 没有 TTY，本来就做不到替用户输入密钥。

def _drop_key_lines(lines, key_name):
    """按行保留内容，丢弃已有的 <key_name>= / export <key_name>= 行——其余行
    （包括另一个 provider 的 key）原样保留。"""
    kept = []
    for line in lines:
        bare = line[len("export "):] if line.startswith("export ") else line
        name = bare.split("=", 1)[0].strip()
        if name == key_name:
            continue
        kept.append(line)
    return kept


def _rewrite_env_file(mutate):
    """读 <config dir>/.env（软链接会读写它指向的真实文件，链接本身不变），用
    mutate(lines) 算出新内容，临时文件 O_EXCL 独占创建、flush+fsync、os.replace
    原子换入，最后强制 chmod 600（不依赖 umask）。返回实际写入的文件路径。"""
    cfg_dir = config_dir()
    os.makedirs(cfg_dir, mode=0o700, exist_ok=True)
    target = os.path.join(cfg_dir, ".env")
    real_target = os.path.realpath(target) if os.path.islink(target) else target
    real_dir = os.path.dirname(real_target) or "."
    os.makedirs(real_dir, mode=0o700, exist_ok=True)

    # 只有“文件不存在”才当空文件；读不了（权限、编码损坏等）必须停下——否则会用
    # 只含新内容的文件覆盖掉原文件，把另一个 provider 的 key 一起抹掉。
    try:
        with open(real_target, "r", encoding="utf-8") as f:
            existing = f.read()
    except FileNotFoundError:
        existing = ""
    except (OSError, UnicodeDecodeError) as e:
        raise JevError(f"jev: 无法读取 {real_target}（{e}），未作更改。", 2)

    lines = mutate(existing.splitlines())
    content = ("\n".join(lines) + "\n") if lines else ""

    tmp_path = os.path.join(real_dir, f".jev-env-{os.getpid()}-{int(time.time() * 1000)}.tmp")
    fd = os.open(tmp_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, real_target)
    except BaseException:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise
    os.chmod(real_target, 0o600)
    return real_target


def write_key_to_env_file(key, key_name):
    """把 <key_name> 写进 <config dir>/.env：保留其它行（另一个 provider 的
    key 等），已有的 <key_name> 行（含 export 形式）被替换——一个文件可以同时
    存两个 provider 的 key。"""
    def mutate(lines):
        kept = _drop_key_lines(lines, key_name)
        kept.append(f"{key_name}={key}")
        return kept
    return _rewrite_env_file(mutate)


def remove_key_from_env_file(key_name):
    """从 <config dir>/.env 里删掉 <key_name> 那一行，保留其它行；文件本身即使
    删空也保留（不删除文件），供 `jev auth remove` 使用。"""
    return _rewrite_env_file(lambda lines: _drop_key_lines(lines, key_name))


def cmd_auth_set(args):
    provider = resolve_auth_provider(getattr(args, "provider", None))
    info = PROVIDERS[provider]
    use_stdin = getattr(args, "stdin", False)

    if use_stdin:
        # 供密码管理器/自动化使用：`op read "op://..." | jev auth set --stdin`。
        # 不需要 TTY，也不做交互确认——前缀不对就直接报错，不写入任何东西。
        key = sys.stdin.readline().strip()
        if not key:
            raise JevError("jev: stdin 为空，未作更改。", 2)
        if info["key_prefix"] and not key.startswith(info["key_prefix"]):
            raise JevError(
                f"jev: 这不像是 {info['label']} 密钥（通常以 {info['key_prefix']} 开头），"
                "未作更改；--stdin 模式不支持交互确认，去掉该参数重试。",
                2,
            )
        if not info["key_prefix"] and key.startswith("sk-or-"):
            raise JevError(
                "jev: 这看起来是 OpenRouter 的密钥，未作更改；"
                "--stdin 模式不支持交互确认，去掉该参数重试。",
                2,
            )
    else:
        if not sys.stdin.isatty():
            raise JevError(
                "jev: auth set 需要在你自己的终端里交互运行（输入不回显），"
                "或加 --stdin 从管道读取（供密码管理器使用）；"
                f"CI 等非交互环境请用 {info['key_env']} 环境变量。",
                2,
            )
        try:
            raw = getpass.getpass(f"{info['label']} API key（输入不回显，创建于 {info['key_page']}）: ")
        except (EOFError, KeyboardInterrupt):
            print(file=sys.stderr)
            raise JevError("jev: 已取消，未作更改。", 2)

        key = raw.strip()
        if not key:
            raise JevError("jev: 未输入内容，未作更改。", 2)

        if info["key_prefix"] and not key.startswith(info["key_prefix"]):
            print(f"jev: 警告：这不像是 {info['label']} 密钥（通常以 {info['key_prefix']} 开头）。", file=sys.stderr)
            try:
                answer = input("继续保存吗？[y/N] ")
            except (EOFError, KeyboardInterrupt):
                print(file=sys.stderr)
                answer = ""
            if answer.strip().lower() not in ("y", "yes"):
                raise JevError("jev: 已取消，未作更改。", 2)
        elif not info["key_prefix"] and key.startswith("sk-or-"):
            # TypeSafe 没有已知前缀；唯一值得多问一句的情形是它长得像 OpenRouter 的 key。
            try:
                answer = input("jev: 这看起来是 OpenRouter 的密钥，要保存为 TypeSafe 密钥吗？[y/N] ")
            except (EOFError, KeyboardInterrupt):
                print(file=sys.stderr)
                answer = ""
            if answer.strip().lower() not in ("y", "yes"):
                raise JevError("jev: 已取消，未作更改。", 2)

    target = write_key_to_env_file(key, info["key_env"])
    print(f"已保存到 {target}（权限 600）。运行 jev auth check 验证。")
    if os.environ.get(info["key_env"]):
        print(f"提示：环境变量 {info['key_env']} 已设置，读取时优先于这个文件。", file=sys.stderr)
    elif os.environ.get("JEV_ENV_FILE"):
        print("提示：JEV_ENV_FILE 已设置，读取时优先于这个文件。", file=sys.stderr)

    # 两边都配置了密钥、又没有固定默认时，提示怎么把结果定下来，脚本才可复现。
    other = "openrouter" if provider == "typesafe" else "typesafe"
    other_key, _, _ = locate_api_key(other)
    if other_key and not os.environ.get("JEV_PROVIDER") and not read_pinned_provider():
        print(
            f"提示：两个 provider 都配置了密钥，运行 jev provider default {provider} "
            "固定默认走哪个，脚本行为才可复现。",
            file=sys.stderr,
        )

    try:
        active_provider, reason = resolve_provider_name(None)
        print(f"当前 provider：{PROVIDERS[active_provider]['label']}（{_reason_label(reason)}）")
    except JevError:
        pass
    return 0


def _permission_report(path):
    lines = []
    real = os.path.realpath(path) if os.path.islink(path) else path
    if real != path:
        lines.append(f"文件：{path} -> {real}（软链接）")
    else:
        lines.append(f"文件：{path}")
    try:
        mode = stat.S_IMODE(os.stat(real).st_mode)
    except OSError as e:
        lines.append(f"权限：无法读取 ({e})")
        return lines
    lines.append(f"权限：{mode:03o}")
    if mode & (stat.S_IRGRP | stat.S_IROTH):
        lines.append(f"警告：其他系统用户可能可读此文件，建议 chmod 600 {real}")
    return lines


def _reason_label(reason):
    return {
        "--provider": "--provider",
        "JEV_PROVIDER": "JEV_PROVIDER",
        "config.ini": "config.ini",
        "auto": "自动",
    }.get(reason, reason or "")


def cmd_auth_status(args):
    try:
        active_provider, reason = resolve_provider_name(getattr(args, "provider", None))
    except JevError:
        active_provider, reason = None, None

    if active_provider:
        print(f"当前 provider：{PROVIDERS[active_provider]['label']}（{_reason_label(reason)}）")
    else:
        print("当前 provider：未确定（未找到任何 API key）")

    for name, info in PROVIDERS.items():
        key, source, path = locate_api_key(name)
        print(f"[{info['label']}]")
        if not key:
            print(f"  未配置 {info['key_env']}。请在你自己的终端运行 {_auth_set_cmd(name)}（写入 {path}）。")
            continue
        if source == "env":
            print(f"  来源：环境变量 {info['key_env']}")
        elif source == "JEV_ENV_FILE":
            print(f"  来源：$JEV_ENV_FILE -> {path}")
            for line in _permission_report(path):
                print(f"  {line}")
        else:
            print(f"  来源：配置文件 {path}")
            for line in _permission_report(path):
                print(f"  {line}")

    active_key = None
    if active_provider:
        active_key, _, _ = locate_api_key(active_provider)
    return 0 if active_key else 1


def _fmt_usd(x):
    s = f"{x:.4f}".rstrip("0").rstrip(".")
    return s if s else "0"


def _extract_model_names(payload):
    """防御式解析 GET /v1/models 的响应：可能是裸列表，也可能是带 data/models
    键的对象；列表项可能是字符串，也可能是带 id/name 的对象。"""
    items = None
    if isinstance(payload, list):
        items = payload
    elif isinstance(payload, dict):
        items = payload.get("data")
        if items is None:
            items = payload.get("models")
    if not isinstance(items, list):
        return []
    names = []
    for item in items:
        if isinstance(item, str):
            names.append(item)
        elif isinstance(item, dict):
            n = item.get("id") or item.get("name")
            if n:
                names.append(str(n))
    return names


def cmd_auth_check(args):
    provider, _reason = resolve_provider_name(getattr(args, "provider", None))
    key = resolve_api_key(provider)
    url = resolve_key_url(provider)
    headers = provider_headers(provider, key)

    try:
        status, body = http_get(url, headers, timeout=15)
    except JevNetworkError as e:
        raise JevError(f"jev: 网络错误: {e}", 2)

    if provider == "typesafe":
        if status in (401, 403):
            raise JevError(
                f"jev: 密钥无效（HTTP {status}），请在你自己的终端运行 jev auth set 重新设置", 2
            )
        if status != 200:
            raise JevError(format_api_error(status, body, provider=provider), 2)
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            raise JevError("jev: 响应不是合法 JSON", 2)
        print("密钥有效（TypeSafe）")
        for n in _extract_model_names(payload):
            print(n)
        return 0

    # openrouter
    if status == 401:
        raise JevError(
            "jev: 密钥无效（HTTP 401），请在你自己的终端运行 jev auth set --provider openrouter 重新设置", 2
        )
    if status != 200:
        raise JevError(format_api_error(status, body, provider=provider), 2)

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise JevError("jev: 响应不是合法 JSON", 2)
    data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(data, dict):
        raise JevError("jev: 响应格式异常，缺少 data 字段", 2)

    # 绝不打印 label（无标签 key 的 label 会带一段脱敏后的密钥片段）或
    # creator_user_id（账号标识）——两者都不该出现在 CLI 输出里。
    print("密钥有效")
    limit = data.get("limit")
    if limit is None:
        print("额度：无上限")
    else:
        remaining = data.get("limit_remaining")
        if isinstance(remaining, (int, float)):
            print(f"额度：{_fmt_usd(limit)} USD，剩余 {_fmt_usd(remaining)} USD")
        else:
            print(f"额度：{_fmt_usd(limit)} USD")
    usage = data.get("usage")
    if isinstance(usage, (int, float)):
        print(f"累计用量：{_fmt_usd(usage)} USD")
    return 0


def cmd_auth_remove(args):
    provider = resolve_auth_provider(getattr(args, "provider", None))
    info = PROVIDERS[provider]
    key, source, path = locate_api_key(provider)
    if not key:
        print(f"jev: {info['key_env']} 未配置，无需移除。", file=sys.stderr)
        return 1

    if source in ("env", "JEV_ENV_FILE"):
        where = "环境变量" if source == "env" else f"$JEV_ENV_FILE（{path}）"
        raise JevError(
            f"jev: {info['key_env']} 来自{where}，不是 jev 管理的配置文件，"
            "不会代为修改——请自己 unset 或编辑该文件。",
            2,
        )

    removed_path = remove_key_from_env_file(info["key_env"])
    print(f"已从 {removed_path} 移除 {info['key_env']}。")
    try:
        active_provider, reason = resolve_provider_name(None)
        print(f"当前 provider：{PROVIDERS[active_provider]['label']}（{_reason_label(reason)}）")
    except JevError as e:
        print(str(e), file=sys.stderr)
    return 0


def cmd_auth(args):
    verb = getattr(args, "auth_verb", None)
    handlers = {
        "set": cmd_auth_set, "status": cmd_auth_status,
        "check": cmd_auth_check, "remove": cmd_auth_remove,
    }
    if verb not in handlers:
        raise JevError("jev: 请指定 auth 子命令 (set/status/check/remove)", 2)
    return handlers[verb](args)


# --------------------------------------------------------------------------
# provider 子命令 (list/default)
# --------------------------------------------------------------------------

def _provider_endpoint_host(provider):
    return urlparse(PROVIDERS[provider]["base_url"]).netloc


def cmd_provider_list(args):
    try:
        active_provider, reason = resolve_provider_name(getattr(args, "provider", None))
    except JevError:
        active_provider, reason = None, None

    rows = []
    for name, info in PROVIDERS.items():
        key, source, _path = locate_api_key(name)
        rows.append({
            "id": name,
            "label": info["label"],
            "active": name == active_provider,
            "endpoint": _provider_endpoint_host(name),
            "key_env": info["key_env"],
            "configured": bool(key),
            "key_source": source if key else None,
            "default_model": info["default_model"],
        })

    if getattr(args, "json", False):
        print(json.dumps(
            {"provider": active_provider, "reason": reason, "providers": rows}, ensure_ascii=False
        ))
        return 0

    for r in rows:
        marker = "*" if r["active"] else " "
        key_state = f"已配置（{r['key_source']}）" if r["configured"] else "未配置"
        print(f"{marker} {r['id']:<10} {r['endpoint']:<24} {r['key_env']:<20} {key_state:<18} {r['default_model']}")
    if active_provider:
        print(f"当前：{PROVIDERS[active_provider]['label']}（{_reason_label(reason)}）")
    else:
        print("当前：未确定（未找到任何 API key）")
    return 0


def cmd_provider_default(args):
    target = getattr(args, "target", None)

    if target is None:
        pinned = read_pinned_provider()
        print(pinned if pinned else "auto")
        return 0

    if target == "auto":
        write_pinned_provider(None)
    else:
        if target not in PROVIDERS:
            raise JevError(f"jev: 未知的 provider: {target}（可选 {'/'.join(PROVIDERS)} 或 auto）", 2)
        write_pinned_provider(target)
        key, _, _ = locate_api_key(target)
        if not key:
            print(
                f"jev: 警告：{PROVIDERS[target]['label']} 还没有配置密钥，"
                f"运行 {_auth_set_cmd(target)}",
                file=sys.stderr,
            )

    try:
        active_provider, reason = resolve_provider_name(None)
        print(f"当前 provider：{PROVIDERS[active_provider]['label']}（{_reason_label(reason)}）")
    except JevError as e:
        print(str(e), file=sys.stderr)
    return 0


def cmd_provider(args):
    verb = getattr(args, "provider_verb", None)
    handlers = {"list": cmd_provider_list, "default": cmd_provider_default}
    if verb not in handlers:
        raise JevError("jev: 请指定 provider 子命令 (list/default)", 2)
    return handlers[verb](args)


# --------------------------------------------------------------------------
# 参数解析
# --------------------------------------------------------------------------

class JevArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        self.print_usage(sys.stderr)
        self.exit(2, f"jev: 参数错误: {message}\n")


def build_common_parser():
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("-s", "--state", default=None, metavar="TEXT|@FILE|-",
                         help="状态来源：文本 / @文件路径 / - 表示 stdin（默认读取 stdin）")
    common.add_argument("--text", action="store_true", help="始终把状态当纯文本，不尝试解析 JSON")
    common.add_argument("-l", "--lines", action="store_true",
                         help="逐行模式：输入的每个非空行作为一次独立判断")
    common.add_argument("--field", default=None, metavar="KEY",
                         help="逐行模式下，若该行是 JSON 对象，取其字段 KEY 作为状态")
    common.add_argument("-j", "--jobs", type=int, default=8, help="逐行模式的并发数（默认 8）")
    common.add_argument("--json", action="store_true", help="输出机器可读 JSON（逐行模式为 JSONL）")
    common.add_argument("-m", "--model", default=None,
                         help="模型 ID（默认 $JEV_MODEL 或所选 provider 的默认模型：typesafe=jev-latest，"
                              "openrouter=~typesafe/jev-latest；jev-latest 和 jev-X.Y 写法会按 provider 自动换算，jev-preview 只有 typesafe 有）")
    common.add_argument("--provider", choices=list(PROVIDERS), default=None,
                         help="选择后端：typesafe 或 openrouter（默认 --provider → $JEV_PROVIDER → "
                              "配置文件里的 JEV_PROVIDER= → 自动检测哪个 key 存在）")
    common.add_argument("--timeout", type=float, default=60, help="单次请求超时秒数（默认 60）")
    common.add_argument("--retries", type=int, default=3, help="失败重试次数（默认 3）")
    common.add_argument("--verbose", action="store_true", help="在 stderr 输出 provider/耗时/token/费用统计")
    return common


def build_parser():
    common = build_common_parser()
    parser = JevArgumentParser(prog="jev", description="jev - 把模糊判断变成带概率的类型化答案 (TypeSafe Jev)")
    parser.add_argument("--version", action="store_true", help="显示版本号并退出")
    sub = parser.add_subparsers(dest="verb", help="子命令")

    p_yes = sub.add_parser("yes", parents=[common], help="是非判断，输出校准概率")
    p_yes.add_argument("question", help="要判断的问题/说明")
    p_yes.add_argument("--true", dest="true_desc", default=None, metavar="DESC", help="真 (yes) 的含义说明")
    p_yes.add_argument("--false", dest="false_desc", default=None, metavar="DESC", help="假 (no) 的含义说明")
    p_yes.add_argument("-t", "--threshold", type=float, default=0.5, metavar="P", help="判定为 yes 的概率阈值（默认 0.5）")
    p_yes.add_argument("--quiet", action="store_true", help="不打印结果，只用退出码")

    p_pick = sub.add_parser("pick", parents=[common], help="从多个选项中单选")
    p_pick.add_argument("question", help="要判断的问题/说明")
    p_pick.add_argument("options", nargs="+", metavar="OPTION[=DESC]", help="候选项，至少两个")
    p_pick.add_argument("--other", action="store_true", help='追加一个 "other" 选项（以上都不符合）')
    p_pick.add_argument("-p", "--probs", action="store_true", help="按概率降序打印每个选项")
    p_pick.add_argument("--min-confidence", type=float, default=None, metavar="C", help="置信度低于 C 时退出码为 1")

    p_score = sub.add_parser("score", parents=[common], help="有序刻度打分")
    p_score.add_argument("question", help="要判断的问题/说明")
    p_score.add_argument("labels", nargs="*", metavar="LABEL", help="从低到高的刻度标签，2-10 个")
    p_score.add_argument("--range", dest="range", default=None, metavar="A-B", help="用整数区间代替 LABEL，例如 1-5")
    p_score.add_argument("-p", "--probs", action="store_true", help="按刻度顺序打印每个等级的概率")

    p_filter = sub.add_parser("filter", parents=[common], help="按是非判断过滤输入行（类似 grep）")
    p_filter.add_argument("question", help="要判断的问题/说明")
    p_filter.add_argument("--true", dest="true_desc", default=None, metavar="DESC", help="真 (yes) 的含义说明")
    p_filter.add_argument("--false", dest="false_desc", default=None, metavar="DESC", help="假 (no) 的含义说明")
    p_filter.add_argument("-t", "--threshold", type=float, default=0.5, metavar="P", help="判定为匹配的概率阈值（默认 0.5）")
    p_filter.add_argument("-v", "--invert", action="store_true", help="反选：打印不匹配的行")
    p_filter.add_argument("--with-prob", action="store_true", help="每行前加上概率")

    p_run = sub.add_parser("run", parents=[common], help="运行预设 spec；不带 SPEC 则列出可用 spec")
    p_run.add_argument("spec", nargs="?", default=None, help="spec 名称或文件路径")

    p_raw = sub.add_parser("raw", help="stdin 传入完整请求 JSON，直接返回原始响应 JSON")
    p_raw.add_argument("-m", "--model", default=None, help="缺少 model 字段时使用的默认模型")
    p_raw.add_argument("--provider", choices=list(PROVIDERS), default=None,
                        help="选择后端：typesafe 或 openrouter（同 common 选项的解析顺序）")
    p_raw.add_argument("--timeout", type=float, default=60, help="请求超时秒数（默认 60）")
    p_raw.add_argument("--retries", type=int, default=3, help="失败重试次数（默认 3）")
    p_raw.add_argument("--verbose", action="store_true", help="在 stderr 输出 provider/耗时/token/费用统计")

    p_auth = sub.add_parser("auth", help="管理 API key（set/status/check/remove），支持 typesafe/openrouter 两个 provider")
    auth_sub = p_auth.add_subparsers(dest="auth_verb", help="auth 子命令")
    p_auth_set = auth_sub.add_parser("set", help="设置密钥：交互（需要 TTY）或 --stdin 从管道读取")
    p_auth_set.add_argument("--provider", choices=list(PROVIDERS), default=None,
                             help="要设置密钥的 provider（默认 --provider → $JEV_PROVIDER → typesafe）")
    p_auth_set.add_argument("--stdin", action="store_true",
                             help="从 stdin 第一行读取密钥，跳过交互提示（供密码管理器/自动化使用，不需要 TTY）")
    p_auth_status = auth_sub.add_parser("status", help="查看两个 provider 的密钥来源、文件路径与权限；不打印密钥")
    p_auth_status.add_argument("--provider", choices=list(PROVIDERS), default=None,
                                help="仅影响“当前 provider”那一行判断的显式来源")
    p_auth_check = auth_sub.add_parser("check", help="联网校验密钥是否有效（只读，不计费）")
    p_auth_check.add_argument("--provider", choices=list(PROVIDERS), default=None,
                               help="校验指定 provider 的密钥（默认按当前 provider 解析）")
    p_auth_remove = auth_sub.add_parser("remove", help="从配置文件移除某个 provider 的密钥")
    p_auth_remove.add_argument("--provider", choices=list(PROVIDERS), default=None,
                                help="要移除密钥的 provider（默认 --provider → $JEV_PROVIDER → typesafe）")

    p_provider = sub.add_parser("provider", help="查看/固定默认 provider（list/default）")
    provider_sub = p_provider.add_subparsers(dest="provider_verb", help="provider 子命令")
    p_provider_list = provider_sub.add_parser("list", help="列出两个 provider 的密钥/模型状态")
    p_provider_list.add_argument("--provider", choices=list(PROVIDERS), default=None,
                                  help="仅影响“当前”那一行判断的显式来源")
    p_provider_list.add_argument("--json", action="store_true", help="输出机器可读 JSON")
    p_provider_default = provider_sub.add_parser("default", help="查看/固定/清除默认 provider（写 config.ini）")
    p_provider_default.add_argument("target", nargs="?", default=None, metavar="ID|auto",
                                     help="typesafe/openrouter 固定为默认；auto 清除固定；留空打印当前固定值")

    return parser


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------

def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.version:
        print(f"jev {VERSION}")
        return 0

    verb = getattr(args, "verb", None)
    if not verb:
        parser.print_usage(sys.stderr)
        print(
            "jev: 请指定子命令 (yes/pick/score/filter/run/raw/auth/provider)，或使用 --version",
            file=sys.stderr,
        )
        return 2

    handlers = {
        "yes": cmd_yes, "pick": cmd_pick, "score": cmd_score,
        "filter": cmd_filter, "run": cmd_run, "raw": cmd_raw,
        "auth": cmd_auth, "provider": cmd_provider,
    }
    try:
        return handlers[verb](args)
    except JevError as e:
        print(str(e), file=sys.stderr)
        return e.exit_code
    except BrokenPipeError:
        # 下游 (例如 head/grep) 提前关闭了管道，这是正常用法，不是错误。
        _silence_broken_stdout()
        return 0
    except Exception as e:
        print(f"jev: 内部错误: {e}", file=sys.stderr)
        if os.environ.get("JEV_DEBUG") == "1":
            traceback.print_exc()
        return 2


def _silence_broken_stdout():
    try:
        devnull = os.open(os.devnull, os.O_WRONLY)
        os.dup2(devnull, sys.stdout.fileno())
        os.close(devnull)
    except OSError:
        pass


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        # 用 os._exit 硬退出而不是 sys.exit：concurrent.futures.thread 注册了一个
        # atexit 钩子，会在正常解释器关闭时 join 所有 ThreadPoolExecutor 工作线程；
        # 逐行模式里已经在跑的请求（未被 cancel_futures 取消掉的那些）可能还要等到
        # --timeout 才会返回，走正常关闭流程会让 Ctrl-C 卡住。os._exit 跳过 atexit，
        # 保证进程立刻退出。
        try:
            sys.stdout.flush()
        except Exception:
            pass
        try:
            sys.stderr.write("\n")
            sys.stderr.flush()
        except Exception:
            pass
        os._exit(130)
    except BrokenPipeError:
        _silence_broken_stdout()
        sys.exit(0)
