Live deployment of the game (Pushes to the repo gets reflected within a minute): http://guess.westus.cloudapp.azure.com:8081

## High level concepts:

### Immutability
Every object is immutable. To change a property a new copy of the object needs to be initialize.
The class "Entity" facilities this by providing a generic copy method that copies all the properties to a new object with an optional override.

### Game state
The game flow is driven as one huge state machine where next_game_state = current_game_state.updated(unit_of_time). Game state can be thought of a set of smaller game elements state that gets updated the same way. 

Every part of the game can be thought of the same way which results eventually in a coherent game representation.

## Build
You need [`npm`](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions). After you clone, you can do `npm install` to fetch all the dependencies once, then when changing the Typescript file you can then do `npm run build` to generate the Javascript transpiled code. The app is a static site so you can just launch `index.html` to load the game.
