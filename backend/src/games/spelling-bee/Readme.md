# Spelling-bee game

> Diagrams are available here `_doc/diagrams/spelling-bee`.  
> It can easily be modifed using mentionned tools

## Database Diagram

> _User is colontarily simplified as it is a common entity not dedicated to the game_

![Database diagram](/_doc/diagrams/spelling-bee/database-diagram.svg)

## Game Sequence Diagram

![Database diagram](/_doc/diagrams/spelling-bee/spelling-bee-game-sequence-diagram.svg)

Game can be played as guest, which means we don't retreive or save UserGame for guest.  
Data should be saved only for connected users.
