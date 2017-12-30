Live deployment of the project: http://guess.westus.cloudapp.azure.com:8081

## High level concepts:

### Immutability
Every object is immutable. To change a property a new copy of the object needs to be initialize.
The class "Entity" facilities this by providing a generic copy method that copies all the properties to a new object with an optional override.

### Game state
The game flow is driven as one huge state machine where next_game_state = current_game_state.updated(unit_of_time). Game state can be thought of a set of smaller game elements state that gets updated the same way. 

Every part of the game can be thought of the same way which results eventually in a coherent game representation.
