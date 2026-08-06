/* Registers the altaqwaa:// scheme as privileged (must run before app ready). */

import { protocol } from 'electron';

export function registerSchemesAsPrivileged() {
    protocol.registerSchemesAsPrivileged([
        {
            scheme: 'altaqwaa',
            privileges: {
                standard: true,
                secure: true,
                supportFetchAPI: true,
                stream: true,
                corsEnabled: false,
            },
        },
    ]);
}
