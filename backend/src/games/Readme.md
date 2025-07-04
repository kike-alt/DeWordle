# Game structure

For consistency between game, here is the defined structure inside the `games` folder.

- [game-name]
  - [game-name].module.ts
  - [entity or service]
    - dto/ : where to put Dto interfaces
    - entities/ : where we define Repository (DB) entity definition
    - providers/ : where to put services not directly related to an entity of the game (see it like a helpers folder)
    - [entity].controller.ts : define the entrypoint of the API
    - [entity].module.ts : must define all dependencies you need for your module to work
    - [entity].services.ts : define your services to allow to play the game

## How to create a new game

- Create the folder of your game inside `games`

Inside this new folder

- Create your entities
- Create the service that will use the entities repository
- Create the controller that will call the service
- Import all the needed dependencies inside the your game module

- Import your game module inside the `src/games/games.module.ts` file
  We don't need to import anything else, just the game module (like for spelling-bee module)

## Controller constraints

- All you API endpoints must be prefixed by the name of the game like this GET `/spelling-bee/puzzles`

```typescript
@Controller('spelling-bee/puzzles')
```

- Follow REST pattern
  - use http methods accordingly
  - use plural for resources

> ---
>
> **/!\ Don't create dedicated controllers, services or entities for any common element**  
>  Users, Game, Admin, Auth, ... must remain common  
>  Obviously we can call common services inside our game services
>
> ---

## Entity constraints

- In the entity file, prefix the data table by the name of the game to avoid any conlict.  
  You can do this by giving the name of the table when defining your entity.

```typescript
@Entity({ name: 'spelling_bee_puzzle' })
export class Puzzle {
  ...
}
```
