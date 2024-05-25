# Rebar Basic Vehicles API

This plugin provides a comprehensive API for vehicle management in the Rebar framework, enabling vehicle creation, keys or engine.

## Features
- **Create Vehicles:** Players can create vehicles using a command.
- **Manage Vehicle Keys:** Players can give or remove vehicle keys to/from other players.
- **Vehicle Parking:** Players can park their vehicles and update their positions in the database.
- **Vehicle Lock/Unlock:** Players can lock or unlock the nearest vehicle.
- **Engine Toggle:** Players can toggle the engine state of their vehicles.
- **Vehicle Door State:** Players can change the state of vehicle doors.
- **Display Vehicles:** Players can view a list of their vehicles.

## Showcase
<img src="https://i.imgur.com/ve9ShjJ.png"/>

## Installation
From the main directory of your `Rebar` installation:

```
git clone https://github.com/mafineeek/rebar-basic-vehicles-api src/plugins/vehicles
```

## API
<b>All methods are in `vehicles/server/api.ts`</b><br/>
<b><i>⚠️ API is not registered in Rebar's API system, you need to use `useVehiclesApi()` hook manually!</i></b>
