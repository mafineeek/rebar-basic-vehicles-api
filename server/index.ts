import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { useCharacter, useVehicleBinder } from '@Server/document/index.js';
import { Vehicle } from '@Shared/types/index.js';
import { CollectionNames } from '@Server/document/shared.js';
import { VehicleEventNames } from '../shared/events.js';
import { distance } from '@Shared/utility/vector.js';
import { useNotify } from '@Server/player/notify.js';
import { VehicleDocument } from '../shared/types.js';
import { useVehiclesApi } from './api.js';

const Rebar = useRebar();
const messenger = Rebar.messenger.useMessenger();
const database = Rebar.database.useDatabase();
const api = Rebar.useApi();

const {createVehicle, parkVehicle, useKey} = useVehiclesApi();

// Helper function to check if character can perform actions on the vehicle
const canCharacterPerformActionsOnVehicle = (player: alt.Player, vehicle: alt.Vehicle): boolean => {
    const character = useCharacter(player).get();
    const vehicleDocument = vehicle.getMeta('document:vehicle');
    return vehicleDocument && (vehicleDocument.owner === character._id || vehicleDocument.keys.includes(character._id));
};

// Helper function to find the nearest vehicle
const findNearestVehicle = (player: alt.Player): alt.Vehicle | null => {
    return alt.Vehicle.all
        .filter(vehicle => vehicle.getMeta('document:vehicle'))
        .filter(vehicle => vehicle.dimension === player.dimension)
        .filter(vehicle => distance(vehicle.pos, player.pos) < 10)
        .reduce((nearest, vehicle) => {
            return nearest ? (distance(nearest.pos, player.pos) < distance(vehicle.pos, player.pos) ? nearest : vehicle) : vehicle;
        }, null);
};

// Command to create a car
messenger.commands.register({
    name: 'acar',
    desc: 'Create car',
    callback: (player: alt.Player, ...args: string[]) => {
        const character = useCharacter(player).get();
        let carModel: VehicleDocument = {
            model: args[0],
            pos: player.pos,
            rot: player.rot,
            owner: character._id,
            dimension: player.dimension,
            keys: [],
            fuel: 100
        };

        console.log('test0');

        createVehicle(carModel).then(r => {
            console.log('test');
            messenger.message.send(player, {
                content: 'Successfully created vehicle in the database.',
                type: 'system'
            });
        }).catch(err => {
            console.error('Failed to create vehicle:', err);
            messenger.message.send(player, {
                content: 'Failed to create vehicle.',
                type: 'system'
            });
        });
    }
});

// Function to get vehicle entity by ID
const getVehicleEntityById = (id: string): alt.Vehicle | undefined => {
    return alt.Vehicle.all.find(vehicle => vehicle.getMeta('document:vehicle')?._id === id);
};

// Event listener for spawning vehicles
alt.onClient(VehicleEventNames.ToServer.SpawnVehicle, (player, args) => {
    database.get<VehicleDocument>({ _id: args }, CollectionNames.Vehicles).then((vehicle) => {
        if (!vehicle) return;
        const vehicleEntity = getVehicleEntityById(vehicle._id);
        if (!vehicleEntity) {
            const createdVehicle = new alt.Vehicle(vehicle.model, vehicle.pos, vehicle.rot, vehicle.dimension);
            vehicle.stateProps = { ...vehicle.stateProps, lockState: 2 };
            useVehicleBinder(createdVehicle).bind(vehicle, true);
        } else {
            vehicleEntity.destroy();
        }
    });
});

// Command to display all vehicles of the player
messenger.commands.register({
    name: 'vehicles',
    desc: 'Display all your vehicles',
    callback: (player: alt.Player) => {
        const character = useCharacter(player).get();
        database.getMany({
            $or: [{ owner: character._id }, { keys: character._id }]
        }, CollectionNames.Vehicles).then((vehicles) => {
            player.emit(VehicleEventNames.ToClient.OpenMenu, vehicles);
        });
    }
});

// Command to lock or unlock the nearest vehicle
messenger.commands.register({
    name: 'vlock',
    desc: 'Lock or unlock a vehicle',
    callback: (player: alt.Player) => {
        const closestVehicle = findNearestVehicle(player);
        const notify = Rebar.player.useNotify(player);
        if (!closestVehicle) return notify.showNotification('No vehicle found');

        const vehicleDocument = closestVehicle.getMeta('document:vehicle');
        if (!vehicleDocument || !canCharacterPerformActionsOnVehicle(player, closestVehicle)) {
            return notify.showNotification('You do not own this vehicle');
        }

        closestVehicle.lockState = closestVehicle.lockState === 2 ? 1 : 2;
        notify.showNotification(`Vehicle ${closestVehicle.lockState === 2 ? 'unlocked' : 'locked'}`);
    }
});

// Command to toggle the engine of the player's vehicle
messenger.commands.register({
    name: 'vengine',
    desc: 'Toggle engine',
    callback: (player: alt.Player) => {
        const playersVehicle = player.vehicle;
        if (!playersVehicle || !canCharacterPerformActionsOnVehicle(player, playersVehicle) || player.seat !== 1) return;

        playersVehicle.engineOn = !playersVehicle.engineOn;
        Rebar.player.useNotify(player).showNotification(`Engine ${playersVehicle.engineOn ? 'on' : 'off'}`);
    }
});

// Command to change the state of vehicle doors
messenger.commands.register({
    name: 'vdoors',
    desc: 'Change doors open state by providing a door index',
    callback: (player: alt.Player, ...args: string[]) => {
        const playersVehicle = player.vehicle;
        if (!playersVehicle || player.seat !== 1) return;

        const doorIndex = parseInt(args[0]);
        if (isNaN(doorIndex) || doorIndex < 0 || doorIndex > 4) {
            useNotify(player).showNotification('Provide a valid door index [0-4]');
            return;
        }

        playersVehicle.setDoorState(doorIndex, playersVehicle.getDoorState(doorIndex) !== 0 ? 0 : 4);
    }
});

// Command to park the player's vehicle
messenger.commands.register({
    name: 'vpark',
    desc: 'Park your vehicle',
    callback: (player: alt.Player) => {
        const playersVehicle = player.vehicle;
        if (!playersVehicle || !canCharacterPerformActionsOnVehicle(player, playersVehicle) || player.seat !== 1) return;

        parkVehicle(playersVehicle.getMeta("document:vehicle") as VehicleDocument, playersVehicle.pos).then(() => {
            useNotify(player).showNotification('Vehicle parked successfully');
        });
    }
});

// Command to give or take keys from another player
messenger.commands.register({
    name: 'vkeys',
    desc: 'Use /vkeys [playerId] to give or take keys from another player',
    callback: (player: alt.Player, ...args: string[]) => {
        const playersVehicle = player.vehicle;
        if (!playersVehicle || player.seat !== 1) return;

        const userCharacter = useCharacter(player).get();
        if (playersVehicle.getMeta('document:vehicle').owner !== userCharacter._id) return;

        const target = alt.Player.all.find(p => p.id === parseInt(args[0]));
        if (!target || distance(target.pos, player.pos) > 10) {
            useNotify(player).showNotification('No player found');
            return;
        }

        const targetCharacter = useCharacter(target).get();
        if (targetCharacter._id === userCharacter._id) {
            useNotify(player).showNotification('You cannot give keys to yourself');
            return;
        }

        const key = useKey(playersVehicle.getMeta('document:vehicle') as VehicleDocument, target)

        if(key.hasKey(target)) {
            key.removeKey(target);
            useNotify(player).showNotification('Key removed');
        }else{
            key.giveKey(target);
            useNotify(player).showNotification('Key given');
        }

        database.get({
            _id: playersVehicle.getMeta('document:vehicle')?._id
        }, CollectionNames.Vehicles).then((vehicle) => {
            useVehicleBinder(playersVehicle).bind(vehicle as VehicleDocument, true);
        })
    }
});
