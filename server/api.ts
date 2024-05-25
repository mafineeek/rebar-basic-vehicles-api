import { useRebar } from '@Server/index.js';
import * as alt from 'alt-server';
import { VehicleDocument } from '../shared/types.js';
import { CollectionNames } from '@Server/document/shared.js';
import { useCharacter } from '@Server/document/index.js';

const Rebar = useRebar();
const database = Rebar.database.useDatabase();
const api = Rebar.useApi();
const autoincrementApi = api.get('autoincrement-api');

export const useRandomPlate = () => {
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    let plate = '';
    for (let i = 0; i < 6; i++) {
        plate += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return plate;
}

export const useVehiclesApi = () => {
    const vehiclesWithAccessForPlayer = async (player: alt.Player) => {
        const character = useCharacter(player).get();
        return await database.getMany({
            $or: [{ owner: character._id }, { keys: character._id }]
        }, CollectionNames.Vehicles);
    };

    const parkVehicle = async (vehicle: VehicleDocument, pos: alt.IVector3) => {
        await database.update({ _id: vehicle._id, pos }, CollectionNames.Vehicles);
    };

    const createVehicle = async (vehicle: VehicleDocument) => {
        vehicle.uid = await autoincrementApi.getNextIdForCollection(CollectionNames.Vehicles);
        vehicle.numberPlateText = useRandomPlate();
        await database.create(vehicle, CollectionNames.Vehicles);
        return;
    };

    const useKey = (vehicle: VehicleDocument, player: alt.Player) => {
        const giveKey = async (target: alt.Player) => {
            const character = useCharacter(target).get();
            if (!character) {
                return;
            }

            vehicle.keys.push(character._id);
            await database.update({ ...vehicle }, CollectionNames.Vehicles);
        };

        const removeKey = async (target: alt.Player) => {
            const character = useCharacter(target).get();
            if (!character) {
                return;
            }

            vehicle.keys = vehicle.keys.filter(key => key !== character._id);
            await database.update({ ...vehicle }, CollectionNames.Vehicles);
        };

        const hasKey = (target: alt.Player) => {
            const character = useCharacter(target).get();
            if (!character) {
                return;
            }

            return vehicle.keys.includes(character._id);
        };

        return {
            giveKey,
            removeKey,
            hasKey
        };
    };

    const removeVehicle = async (vehicle: VehicleDocument) => {
        await database.destroy(vehicle._id, CollectionNames.Vehicles);
    };

    return {
        vehiclesWithAccessForPlayer,
        parkVehicle,
        createVehicle,
        useKey,
        removeVehicle
    };
};
