import * as alt from 'alt-client';
import { VehicleEventNames } from '../shared/events.js';
import { Vehicle } from '@Shared/types/index.js';
import { useNativeMenu } from '@Client/menus/native/index.js';
import * as natives from 'natives';
import { VehicleDocument } from '../shared/types.js';

alt.onServer(VehicleEventNames.ToClient.OpenMenu, (vehicles: VehicleDocument[]) => {
    createMenu(vehicles);
})

const createMenu = (vehicles: VehicleDocument[]) => {
    const menu = useNativeMenu({
        header: 'My vehicles',
        noExit: false,
        backCallback: () => {
            menu.destroy();
        },
        options: vehicles.map((vehicle) => {
            return {
                text: `[UID: ${vehicle.uid}] ${vehicle.model}`,
                type: 'invoke',
                value: vehicle._id,
                callback: (value) => {
                    alt.emitServer(VehicleEventNames.ToServer.SpawnVehicle, value);
                }
            };
        })
    });
    menu.open();
}

alt.on('enteredVehicle', (vehicle) => {
    console.log('entered vehicle!')
    natives.setPedConfigFlag(alt.Player.local.scriptID, 429, true);
    natives.setPedConfigFlag(alt.Player.local.scriptID, 184, true);
    natives.setPedConfigFlag(alt.Player.local.scriptID, 241, true);
})
