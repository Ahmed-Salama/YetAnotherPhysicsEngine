Live deployment of the project: http://guess.westus.cloudapp.azure.com:8081

## High level concepts:

# Immutability
Every object is immutable. To change a property a new copy of the object needs to be initialize.
The class "Entity" facilities this by providing a generic copy method that copies all the properties to a new object with an optional override.

# Game state
