// migrations.ts
import type { TeamSettings } from './types';

/**
 * La versión actual de la estructura de datos.
 * Incrementar este número cada vez que se realice un cambio incompatible
 * en la estructura de datos guardada en localStorage.
 */
export const DATA_VERSION = 5;

/**
 * Migra los datos de la versión 1 (sin versionar) a la versión 2.
 * - Asegura que cada jugadora en la plantilla (`myTeamRoster`) tenga el objeto `availability`.
 * - Asegura que cada partido (`matches`) tenga el array `media`.
 * - Asegura que la sesión de entrenamiento (`trainingSessions`) tenga la propiedad `finalPart`.
 * - Añade el array `mediaGallery` al estado global si no existe.
 * @param state El estado de la aplicación de la v1.
 * @returns El estado de la aplicación migrado a la v2.
 */
const migrateToV2 = (state: any): any => {
    console.log("Applying migration from v1 to v2...");
    const migratedState = { ...state };

    // 1. Migrar RosterPlayer: añadir campo 'availability' si no existe.
    if (Array.isArray(migratedState.myTeamRoster)) {
        migratedState.myTeamRoster = migratedState.myTeamRoster.map((player: any) => {
            if (!player.availability) {
                return { ...player, availability: { status: 'Disponible', reason: 'Lesión' } };
            }
            return player;
        });
    }

    // 2. Migrar Match: añadir campo 'media' si no existe.
    if (Array.isArray(migratedState.matches)) {
        migratedState.matches = migratedState.matches.map((match: any) => {
            const newMatch = { ...match };
            if (!newMatch.media) {
                newMatch.media = [];
            }
            return newMatch;
        });
    }

    // 3. Migrar TrainingSession: asegurar que existe `finalPart`.
    if (typeof migratedState.trainingSessions === 'object' && migratedState.trainingSessions !== null) {
        for (const dateKey in migratedState.trainingSessions) {
            if (Array.isArray(migratedState.trainingSessions[dateKey])) {
                migratedState.trainingSessions[dateKey] = migratedState.trainingSessions[dateKey].map((session: any) => {
                    if (!session.finalPart) {
                        return { ...session, finalPart: { text: '', duration: 0 } };
                    }
                    return session;
                });
            }
        }
    }
    
    // 4. Añadir `mediaGallery` al nivel superior si no existe.
    if (migratedState.mediaGallery === undefined) {
        migratedState.mediaGallery = [];
    }

    return migratedState;
};

/**
 * Migra los datos de la versión 2 a la versión 3.
 * - Asegura que cada jugadora en `myTeamRoster` tenga el campo `photoUrl`.
 * @param state El estado de la aplicación de la v2.
 * @returns El estado de la aplicación migrado a la v3.
 */
const migrateToV3 = (state: any): any => {
    console.log("Applying migration from v2 to v3...");
    const migratedState = { ...state };

    // 1. Migrar RosterPlayer: añadir campo `photoUrl` si no existe.
    if (Array.isArray(migratedState.myTeamRoster)) {
        migratedState.myTeamRoster = migratedState.myTeamRoster.map((player: any) => {
            if (player.photoUrl === undefined) {
                return { ...player, photoUrl: undefined };
            }
            return player;
        });
    }

    return migratedState;
};

/**
 * Migra los datos de la versión 3 a la versión 4.
 * - Cambia el campo `photoUrl` por `photoId` para usar IndexedDB en lugar de Data URLs.
 * - Los Data URLs antiguos se descartan para evitar problemas de migración. Se deberán volver a subir las fotos.
 * @param state El estado de la aplicación de la v3.
 * @returns El estado de la aplicación migrado a la v4.
 */
const migrateToV4 = (state: any): any => {
    console.log("Applying migration from v3 to v4...");
    const migratedState = { ...state };

    if (Array.isArray(migratedState.myTeamRoster)) {
        migratedState.myTeamRoster = migratedState.myTeamRoster.map((player: any) => {
            if ('photoUrl' in player) {
                delete player.photoUrl;
            }
            if (player.photoId === undefined) {
                player.photoId = undefined;
            }
            return player;
        });
    }

    return migratedState;
};

/**
 * Migra los datos de la versión 4 a la 5.
 * - Añade el objeto `teamSettings` para la personalización de colores.
 * @param state El estado de la aplicación de la v4.
 * @returns El estado de la aplicación migrado a la v5.
 */
const migrateToV5 = (state: any): any => {
    console.log("Applying migration from v4 to v5...");
    const migratedState = { ...state };

    if (!migratedState.teamSettings) {
        migratedState.teamSettings = {
            primaryColor: '#06b6d4', // cyan-600
            secondaryColor: '#67e8f9', // cyan-300
        };
    }

    return migratedState;
};


/**
 * Un objeto que mapea números de versión a sus funciones de migración correspondientes.
 * La clave es la versión a la que se migra (ej., la clave '2' es para migrar de 1 a 2).
 */
const migrations: { [key: number]: (state: any) => any } = {
    2: migrateToV2,
    3: migrateToV3,
    4: migrateToV4,
    5: migrateToV5,
};

/**
 * Ejecuta todas las migraciones necesarias en secuencia.
 * @param loadedData Los datos cargados desde localStorage. Pueden estar en el formato nuevo (con versión) o en el antiguo (sin versión).
 * @returns El estado de la aplicación completamente migrado.
 */
export const runMigrations = (loadedData: any): any => {
    if (!loadedData) return {};
    
    // Determina la versión de los datos y el estado real.
    // El formato antiguo no tenía el objeto wrapper { version, data }.
    const dataVersion = loadedData.version || 1;
    let state = loadedData.version ? loadedData.data : loadedData;

    if (dataVersion >= DATA_VERSION) {
        return state; // No se necesita migración.
    }

    console.log(`Data version mismatch. Current: ${DATA_VERSION}, Stored: ${dataVersion}. Starting migration...`);

    let currentVersion = dataVersion;
    while (currentVersion < DATA_VERSION) {
        currentVersion++;
        const migrationFunc = migrations[currentVersion];
        if (migrationFunc) {
            try {
                state = migrationFunc(state);
            } catch (error) {
                console.error(`Error applying migration for version ${currentVersion}:`, error);
                // Detener la migración en caso de error para evitar corromper más los datos.
                return state; 
            }
        }
    }

    console.log("Migration completed successfully.");
    return state;
};