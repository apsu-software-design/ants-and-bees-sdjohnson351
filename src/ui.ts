/**
 * This file contains the implementation of the user interface.
 * @module
 */
import {AntGame, AntColony, Place, Hive} from './game';
import {Ant, EaterAnt, GuardAnt} from './ants';

/**
 * The Vorpal library is used for command-line interaction
 */
import vorpal = require('vorpal');
/**
 * The CHALK library is used for color in the CLI
 */
import chalk = require('chalk');
/**
 * The lodash library is used to simplify use of arrays, manipulation and testing of values, and creating composite functions.
 */
import _ = require('lodash');

const Vorpal = vorpal();

export function showMapOf(game:AntGame){
  console.log(getMap(game));
}

/**
 * Generates the game map for an instance of AntGame.
 */
function getMap(game:AntGame) {
  let places:Place[][] = game.getPlaces();
  let tunnelLength = places[0].length;

  /** Sets the color of the background of the bee icon to yellow and the color of the icon as black*/
  let beeIcon = chalk.bgYellow.black('B');
   
  let map = '';

  /** Creates the header of the map, with the top phrase in bold */
  map += chalk.bold('The Colony is under attack!\n');
  map += `Turn: ${game.getTurn()}, Food: ${game.getFood()}, Boosts available: [${game.getBoostNames()}]\n`;

  /** Creates an array of spaces equal to the number of coloumns and then combines them into a string along with the word Hive */
  map += '     '+_.range(0,tunnelLength).join('    ')+'      Hive'+'\n';
   
  /** Creates the  top line of = and the number of bees in the hive */
  for(let i=0; i<places.length; i++){
    map += '    '+Array(tunnelLength+1).join('=====');
    
    if(i===0){
      map += '    ';
      let hiveBeeCount = game.getHiveBeesCount();
      if(hiveBeeCount > 0){
        map += beeIcon;
        map += (hiveBeeCount > 1 ? hiveBeeCount : ' ');
      }
    }
    map += '\n';

    /** The row numbers */
    map += i+')  ';
      
    /** Shows each insect of each place */
    for(let j=0; j<places[i].length; j++){ 
      let place:Place = places[i][j];

      map += iconFor(place.getAnt());
      map += ' '; 

      if(place.getBees().length > 0){
        map += beeIcon;
        map += (place.getBees().length > 1 ? place.getBees().length : ' ');
      } else {
        map += '  ';
      }
      map += ' '; 
    }
    map += '\n    ';

    /** Generates the type of floor (tunnel or water) for each place */
    for(let j=0; j<places[i].length; j++){
      let place = places[i][j];
      if(place.isWater()){
        map += chalk.bgCyan('~~~~')+' ';
      } else {
        map += '==== ';
      }
    }
    map += '\n';
  }

  /** Adds the bottom line of numbers for the columns */
  map += '     '+_.range(0,tunnelLength).join('    ')+'\n';

  return map;
}

/**
 * Determines which letter to use for an ant based on the ant type
 */
function iconFor(ant:Ant){
  if(ant === undefined){ return ' ' };
  let icon:string;
  switch(ant.name){
    case "Grower":
      icon = chalk.green('G'); break;
    case "Thrower":
      icon = chalk.red('T'); break;
    case "Eater":
      if((<EaterAnt>ant).isFull())
        icon = chalk.yellow.bgMagenta('E');
      else
        icon = chalk.magenta('E');
      break;
    case "Scuba":
      icon = chalk.cyan('S'); break;
    case "Guard":
      let guarded:Ant = (<GuardAnt>ant).getGuarded();
      if(guarded){
        icon = chalk.underline(iconFor(guarded)); break;
      } else {
        icon = chalk.underline('x'); break;
      }
    default:
      icon = '?';
  }
  return icon;
}

/**
 * Deals with the commands to play the game.
 * Uses Vorpal for command line interaction. 
 */
export function play(game:AntGame) {
  /** Displays AvB $ as the command prompt */
  Vorpal
    .delimiter(chalk.green('AvB $'))
    .log(getMap(game))
    .show();

  /** Defines the show command, which shows the game board */
  Vorpal
    .command('show', 'Shows the current game board.')
    .action(function(args, callback){
      Vorpal.log(getMap(game));
      callback();
    });

  /** Defines the deploy command, along with all the options and documentation for the command.
   * Used to deploy an ant of one of the ant types at a specific tunnel.
   */
  Vorpal
    .command('deploy <antType> <tunnel>', 'Deploys an ant to tunnel (as "row,col" eg. "0,6").')
    .alias('add', 'd')
    .autocomplete(['Grower','Thrower','Eater','Scuba','Guard'])
    .action(function(args, callback) {
      let error = game.deployAnt(args.antType, args.tunnel)
      if(error){
        Vorpal.log(`Invalid deployment: ${error}.`);
      }
      else {
        Vorpal.log(getMap(game));
      }
      callback();
    });
  
    /** Defines the remove command, along with all the options and documentation for the command.
     * Removes ant from a tunnel.
     */
  Vorpal
    .command('remove <tunnel>', 'Removes the ant from the tunnel (as "row,col" eg. "0,6").')
    .alias('rm')
    .action(function(args, callback){
      let error = game.removeAnt(args.tunnel);
      if(error){
        Vorpal.log(`Invalid removal: ${error}.`);
      }
      else {
        Vorpal.log(getMap(game));
      }
      callback();
    });

  /** Defines the boost command, along with all the options and documentation for the command.
   * Applies a boost to the ant in a tunnel.
   */
  Vorpal
    .command('boost <boost> <tunnel>', 'Applies a boost to the ant in a tunnel (as "row,col" eg. "0,6")')
    .alias('b')
    .autocomplete({data:() => game.getBoostNames()})
    .action(function(args, callback){
      let error = game.boostAnt(args.boost, args.tunnel);
      if(error){
        Vorpal.log(`Invalid boost: ${error}`);
      }
      callback();
    })

  /** Defines the turn command, along with all the options and documentation for the command.
   * Ends the current turn. If the player won or lost, it informs them.
   */
  Vorpal
    .command('turn', 'Ends the current turn. Ants and bees will act.')
    .alias('end turn', 'take turn','t')
    .action(function(args, callback){
      game.takeTurn();
      Vorpal.log(getMap(game));
      let won:boolean = game.gameIsWon();
      if(won === true){
        Vorpal.log(chalk.green('Yaaaay---\nAll bees are vanquished. You win!\n'));
      }
      else if(won === false){
        Vorpal.log(chalk.yellow('Bzzzzz---\nThe ant queen has perished! Please try again.\n'));
      }
      else {
        callback();
      }
    });
}
