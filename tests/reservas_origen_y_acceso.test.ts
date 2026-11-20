import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolverContextoOrigenReserva,
  validarAccesoReservaLectura,
} from '../src/lib/auth/acceso-reserva.ts';

describe('Resolución de origen y propiedad en creación de reservas', () => {
  it('asigna CLIENTE_WEB y clienteId del usuario aunque tenga localActivo con rol USUARIO', () => {
    const res = resolverContextoOrigenReserva(
      {
        id: 'usr-cliente-1',
        esSuperAdmin: false,
        localActivo: { rol: 'USUARIO' },
      },
      'CLIENTE_WEB',
      undefined
    );

    assert.equal(res.permitido, true);
    assert.equal(res.origen, 'CLIENTE_WEB');
    assert.equal(res.clienteId, 'usr-cliente-1');
  });

  it('asigna CLIENTE_WEB y clienteId del usuario cuando un miembro del personal reserva desde el flujo web', () => {
    const res = resolverContextoOrigenReserva(
      {
        id: 'usr-admin-1',
        esSuperAdmin: false,
        localActivo: { rol: 'ADMIN' },
      },
      'CLIENTE_WEB',
      undefined
    );

    assert.equal(res.permitido, true);
    assert.equal(res.origen, 'CLIENTE_WEB');
    assert.equal(res.clienteId, 'usr-admin-1');
  });

  it('asigna CLIENTE_WEB por defecto si no se especifica origen aunque tenga localActivo', () => {
    const res = resolverContextoOrigenReserva(
      {
        id: 'usr-dueno-1',
        esSuperAdmin: false,
        localActivo: { rol: 'DUENO' },
      },
      undefined,
      undefined
    );

    assert.equal(res.permitido, true);
    assert.equal(res.origen, 'CLIENTE_WEB');
    assert.equal(res.clienteId, 'usr-dueno-1');
  });

  it('permite MOSTRADOR_ADMIN para personal de patio y respeta clienteId opcional', () => {
    const resSinCliente = resolverContextoOrigenReserva(
      {
        id: 'usr-asesor-1',
        esSuperAdmin: false,
        localActivo: { rol: 'ASESOR' },
      },
      'MOSTRADOR_ADMIN',
      undefined
    );
    assert.equal(resSinCliente.permitido, true);
    assert.equal(resSinCliente.origen, 'MOSTRADOR_ADMIN');
    assert.equal(resSinCliente.clienteId, null);

    const resConCliente = resolverContextoOrigenReserva(
      {
        id: 'usr-asesor-1',
        esSuperAdmin: false,
        localActivo: { rol: 'ASESOR' },
      },
      'MOSTRADOR_ADMIN',
      'usr-cliente-99'
    );
    assert.equal(resConCliente.permitido, true);
    assert.equal(resConCliente.origen, 'MOSTRADOR_ADMIN');
    assert.equal(resConCliente.clienteId, 'usr-cliente-99');
  });

  it('rechaza MOSTRADOR_ADMIN si el usuario es cliente con rol USUARIO o invitado', () => {
    const resCliente = resolverContextoOrigenReserva(
      {
        id: 'usr-cliente-1',
        esSuperAdmin: false,
        localActivo: { rol: 'USUARIO' },
      },
      'MOSTRADOR_ADMIN',
      undefined
    );
    assert.equal(resCliente.permitido, false);

    const resInvitado = resolverContextoOrigenReserva(
      null,
      'MOSTRADOR_ADMIN',
      undefined
    );
    assert.equal(resInvitado.permitido, false);
  });
});

describe('Control de acceso de lectura en reservas', () => {
  const reservaAjena = {
    localId: 'local-patio-norte',
    clienteId: 'usr-otro-cliente',
    tokenAccesoPublico: 'tok-secreto-123',
  };

  it('deniega lectura a un cliente con el mismo localId si no es dueño ni tiene token', () => {
    const permitido = validarAccesoReservaLectura(reservaAjena, {
      id: 'usr-cliente-1',
      esSuperAdmin: false,
      localActivo: { id: 'local-patio-norte', rol: 'USUARIO' },
    });
    assert.equal(permitido, false);
  });

  it('permite lectura al cliente dueño aunque tenga localActivo con rol USUARIO', () => {
    const permitido = validarAccesoReservaLectura(reservaAjena, {
      id: 'usr-otro-cliente',
      esSuperAdmin: false,
      localActivo: { id: 'local-patio-norte', rol: 'USUARIO' },
    });
    assert.equal(permitido, true);
  });

  it('permite lectura a colaborador del mismo local (rol distinto a USUARIO)', () => {
    const permitido = validarAccesoReservaLectura(reservaAjena, {
      id: 'usr-asesor-1',
      esSuperAdmin: false,
      localActivo: { id: 'local-patio-norte', rol: 'ASESOR' },
    });
    assert.equal(permitido, true);
  });
});
