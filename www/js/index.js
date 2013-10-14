/*
 * NetConnect
 * Version: v.0.1
 * Auth: Chris Langtiw chris@sitebabble.com http://www.sitebabble.com
 * License: GNU
 * License URL: 
 *  
 * Description:
 * This is a tile puzzle game inspired by KNetwalk and Scrambled Net by so-and-so.
 * 
 *
 */


// define bitmask values
var TOP         = 1, // 0001
    RIGHT       = 2, // 0010
    BOTTOM      = 4, // 0100
    LEFT        = 8, // 1000
    D           = { top: 1, right: 2, bottom: 4, left: 8 }, 
    inverted    = { top: 4, right: 8, bottom: 1, left: 2 }; // inverted directions
 
// cell template object
var Cell = {
    index:          0,      // array index
    nodeType:       0,      // type of node
    alignment:      0,      // the rotation alignment of the cell relative to the nodeType
    state:          0,
    connections:    0,      // connection mask to indicate which sides have connectors
    maxConnections: 4,      // server nodes can override this value
    top:            null,   // these will contain functions that return the adjacent
    right:          null,   // cells on those sides. If the side of the cell is on the
    bottom:         null,   // edge of the grid then the function will return undefined
    left:           null
};

// default game options
var defaultOptions = {
    dFactor:        0.5, // should be a nonzero value between 0 and 1 - increases terminal node #
    width:          3, 
    height:         5, 
    wrap:           0
};

// function that will return a value between min and max inclusive
function rnd(max, min) {
    min = min || 0;
    var n = (Math.floor((Math.random()*100)+1) % max) + min;
    return n;
}

// function to pass into array.sort() to randomize element order
var randomSort = function(a,b) { return rnd(3) - 1; };


// initialize the application
var App = {};

App.data = {}; // data repository

/*
    Other Node Types:
    -2  - Server node temporary assignment
    -1  - Non-server node temporary assignment
    0   - No node (empty cell)
    15  - Blocked
    
 */
App.data.nodeList = {
    '1': { nodeType: 1, imgName: 'node01.png', connections: 4 },    // Terminal (1 connection)
    '2': { nodeType: 2, imgName: 'node02.png', connections: 9 },    // Elbow (2 connections)
    '3': { nodeType: 3, imgName: 'node03.png', connections: 5 },    // Straight (2 connections)
    '4': { nodeType: 4, imgName: 'node04.png', connections: 11 },   // 3-sided (3 connections)
    '5': { nodeType: 5, imgName: 'node05.png', connections: 15 },   // 4-sided (4 connections)
    '10': { nodeType: 10, imgName: 'node10.png', connections: 4 },  // 1-outlet power
    '11': { nodeType: 11, imgName: 'node11.png', connections: 5 },  // 2-outlet power straight
    '12': { nodeType: 12, imgName: 'node12.png', connections: 12 }, // 2-outlet power elbow
    '13': { nodeType: 13, imgName: 'node13.png', connections: 14 }, // 3-outlet power
    '14': { nodeType: 14, imgName: 'node14.png', connections: 15 }  // 4-outlet power
};


// Application Constructor
//
// Bind any events that are required on startup. Common events are:
// 'load', 'deviceready', 'offline', and 'online'.
App.initialize = function() {
    this.bindEvents();
    document.addEventListener('deviceready', App.launch, false);
}; // initialize

// App.launch runs when the device APIs are ready
App.launch = function() {
    
    //var timeStart = new Date().getTime();
    
    // initialize screen setup
    var bHeight = App.data.bHeight = $(document.body).height();
    var bWidth = App.data.bWidth = $(document.body).width();
    
    var $header = App.data.header = $('header');
    var hHeight = App.data.hHeight = $header.height();
    var $footer = App.data.footer = $('footer');
    var fHeight = App.data.fHeight = $footer.height();
    
    App.data.splashDiv = $('#splash');
    App.data.newgameDiv = $('#newgame');
    App.data.helpDiv = $('#help');
    
    $header.children().eq(1).html(bWidth + 'x' + bHeight);
    
    App.data.gridDiv = $('#grid');
    var $grid = App.data.gridDiv;
    
    $grid.height(bHeight - hHeight - fHeight);
    
    App.data.splashDiv.height(bHeight - hHeight - fHeight);
    App.data.newgameDiv.height(bHeight - hHeight - fHeight);
    App.data.helpDiv.height(bHeight - hHeight - fHeight);
    
    
    // set up handlers
    $grid
        .on('click', '.cell', App.handleMove);
    
    $header
        .on('click','div',function(e) {
            switch(true) {
                case $(this).hasClass('newgame'):
                    App.newGameOptions();
                break;
                case $(this).hasClass('help'):
                    App.showHelpScreen();
                break;
            }
         });
    
    
    App.data.gameStatus = 0; // 0 = stopped; 1 = running; 2 = paused
    
    //var timeStop = new Date().getTime();
    //var timeEl = timeStop - timeStart;
    //console.log('execution time:',timeEl);
    
}; // launch

App.showHelpScreen = function() {
    
    App.data.newgameDiv.hide();
    App.data.helpDiv
        .click(function() { App.data.helpDiv.hide(); })
        .show();

}; // showHelpScreen

App.newGameOptions = function() {
    
    var gameOptions = { wrap: 0 };
    
    var gs = [
        { width: 3, height: 5 },
        { width: 6, height: 9 },
        { width: 9, height: 12 }
    ];
    
    App.data.newgameDiv
        .on('change','input',function(e) {
            var $this = $(this);
            
            switch(true) {
                case $this.attr('name') == 'gridsize':
                    gameOptions = $.extend({}, gameOptions, gs[$this.val()]);
                break;
            
                case $this.attr('name') == 'wrap':
                    gameOptions.wrap = this.checked? 1: 0;
                break;
            }
            
         })
        .on('click','[type="button"]',function(e) {
            
            App.data.newgameDiv.hide();
            App.newGame( gameOptions );
            
         });
    
    App.data.helpDiv.hide();
    App.data.newgameDiv.show();
    
    
    
    

}; // newGameOptions

App.newGame = function(gameOptions) {
    
    gameOptions = $.extend({}, defaultOptions, gameOptions);
    
    // reset game board
    App.data.gridDiv.empty(); 
    
    // initialize grid
    App.createGrid(gameOptions);
    
    // build maze network
    App.buildNetwork(gameOptions);
    
    // now go through the cells and determine which nodes belong in each cell
    App.setNodeTypes();
    
    // scramble cells
    App.scrambleCells();
    
    // display game grid
    App.drawGrid();
    
    // check connections to see if any cells are connected
    App.updateConnections();
    
    // reset game state and start timer
    App.data.allConnected = false;
    App.data.movesMade = 0;
    App.data.gameStatus = 1;
    App.data.gameStartTime = new Date().getTime();
    
    
    App.data.gameTimer = 
    setInterval(
        function() {
            var now = new Date().getTime();
            var elapsedTime = new Date(now - App.data.gameStartTime);
            App.data.footer
                .children().eq(2)
                .html('Time: '+elapsedTime.getMinutes() +':'+ ('0'+ elapsedTime.getSeconds()).substr(-2));
        },
        1000
    );
    
}; // newGame

App.handleMove = function(e) {
    
    if (App.data.gameStatus == 2) return; // no moves while paused
    
    // rotate the cell on the game board
    App.rotateCellDiv( $(this) );
    
    // increment move counter
    App.data.movesMade++;
    App.data.footer.children().eq(0).html('Moves: ' + App.data.movesMade);

    // put in a timer to correspond with the CSS rotation animation duration
    // the connections are updated after the rotation completes
    setTimeout(
        function() {
            // update connection status
            App.updateConnections();
            
            // check allConnected flag to check for game finish when game is running
            if (App.data.gameStatus == 1 && App.data.allConnected) {
                App.finishGame();
            }
            
        },
        275
    );
    
}; // handleMove

App.finishGame = function() {
    
    App.data.gameStatus = 0;
    var gameStopTime = new Date().getTime();
    clearInterval(App.data.gameTimer);
    var elapsedTime = gameStopTime - App.data.gameStartTime;
    var gameTimer = new Date(elapsedTime);
    
    //console.log('Total moves:',App.data.movesMade,'Time:',gameTimer.getMinutes(),':',gameTimer.getSeconds());
    alert('You Win!' + '\n' +
          'Total moves:' + App.data.movesMade + '\n' + 
          'Time:' + gameTimer.getMinutes() + ':' + gameTimer.getSeconds());
    
}; // finishGame

App.createGrid = function(params) {
    
    App.data.cellCount = params.width * params.height;
    App.data.grid = {
        width:      params.width,
        height:     params.height,
        wrap:       params.wrap
    };
    App.data.cells = [];
    
    // local alias shortcuts to data
    var cellCount = App.data.cellCount,
        cells = App.data.cells,
        grid = App.data.grid;
    
    // create the empty cells that make up the grid and link together
    for (var c = 0; c < cellCount; c++) {
        var tmpCell = Object.create(Cell);
        tmpCell.index = c;
        
        // Set methods to return adjacent cells
        // (IIFEs needed to make this work, not sure why)
        
        // top
        (function(cell) {
            if (cell.index >= grid.width) {
                cell.top = function() { return cells[cell.index - grid.width]; };
            } else if (grid.wrap) {
                cell.top = function() { return cells[grid.width * (grid.height - 1) + cell.index]; };
            } else {
                cell.top = function() { return undefined; };
            }
        })(tmpCell);
        
        // bottom
        (function(cell) {
            if (cell.index < grid.width * (grid.height - 1)) {
                cell.bottom = function() { return cells[cell.index + grid.width]; };
            } else if (grid.wrap) {
                cell.bottom = function() { return cells[cell.index - grid.width * (grid.height - 1)]; };
            } else {
                cell.bottom = function() { return undefined; };
            }
        })(tmpCell);

        // left
        (function(cell) {
            if (cell.index % grid.width > 0) {
                cell.left = function() { return cells[cell.index - 1]; };
            } else if (grid.wrap) {
                cell.left = function() { return cells[cell.index - 1 + grid.width]; };
            } else {
                cell.left = function() { return undefined; };
            }
        })(tmpCell);
        
        // right
        (function(cell) {
            if (cell.index % grid.width < grid.width - 1) {
                cell.right = function() { return cells[cell.index + 1]; };
            } else if (grid.wrap) {
                cell.right = function() { return cells[cell.index + 1 - grid.width]; };
            } else {
                cell.right = function() { return undefined; };
            }
        })(tmpCell);
        
        App.data.cells.push(tmpCell);
    }
    
}; // createGrid

App.buildNetwork = function(params) {

    var cells = App.data.cells;
    var occupiedCells = [];
    // first door to place is the server, which we will put in a random cell
    App.data.serverIndex = rnd(App.data.cellCount);
    cells[App.data.serverIndex].nodeType = -2;
    //cells[App.data.serverIndex].status = 1; // the server starts out connected <- will do in pathfind
    cells[App.data.serverIndex].maxConnections = rnd(4,1);
    occupiedCells.push(App.data.serverIndex);
    
    //console.log('server index',serverIndex,'maxconnections',cells[serverIndex].maxConnections,cells[serverIndex]);
    
    // while doorcount < total_rooms - 1
    while (occupiedCells.length < App.data.cellCount) { // omitted the -1
        // pick a random room with a door; if none pick a room
        var cellIndex = occupiedCells.sort(randomSort)[0];
        
        //console.log('setting doors for index',cellIndex);
        
        // find directions doors can be placed
            // is a door already there?
            // is that direction out of bounds?
            // is there a room already there?
            // is the cell's max connection limit reached?
        var cell = App.data.cells[cellIndex];
        
        
        if (!cell.maxConnections) continue; // connection limit reached, skip
        
        var paths = [];
        
        if ( !(cell.connections & TOP) && cell.top() != undefined && cell.top().nodeType === 0 ) {
            paths.push('top');
        }
        
        if ( !(cell.connections & RIGHT) && cell.right() != undefined && cell.right().nodeType === 0 ) {
            paths.push('right');
        }
        
        if ( !(cell.connections & BOTTOM) && cell.bottom() != undefined && cell.bottom().nodeType === 0 ) {
            paths.push('bottom');
        }
        
        if ( !(cell.connections & LEFT) && cell.left() != undefined && cell.left().nodeType === 0 ) {
            paths.push('left');
        }
        
        //console.log('Open neighbors for cell',cellIndex,':',paths);
        
        
        // if no open neighbors then continue
        if (paths.length == 0) continue;
        
        // pick random direction and place door
        var dir = paths.sort(randomSort)[0];
        cell.connections |= D[dir];
        
        //console.log('direction:',dir);
    
        // place opposite door in the other room to connect rooms
        var n = cell[dir]();
        n.connections |= inverted[dir];
        
        // randomly limit the new node's connection to just this one, which will make it
        // a terminal
        if ( rnd(100) < (10 * params.dFactor) ) n.maxConnections = 0; 
        
        //console.log('Connected',dir,'index:',n.index,'connections',inverted[dir]);
        
        // add new room to occupiedCells
        occupiedCells.push(n.index);
        n.nodeType = -1; // temp flag to mark cell connected
        
        cell.maxConnections--;
    
    } // while 
    
    //window.occupiedCells = occupiedCells;
    
}; // buildNetwork

App.scrambleCells = function() {
    
    // go through cells and rotate each one a random number of times
    $.each(
        App.data.cells,
        function(cellIndex, cell) {
        
            var iterations = rnd(4);
            //console.log('rotation iterations:',iterations);
            for (var c = 0; c < iterations; c++) {
                App.rotateCell(cellIndex);
            }
        
        
        } // function
    );
    
}; // scrambleCells

App.updateConnections = function() {
    
    // the question is, is pathfinding starting at the server
    // node the simplest route to take? Likely yes.
    
    // so we start with a node we know is connected (the server node) and mark it.
    // if it is already connected we know we've been here before so abort
    // we find the directions available to move to 
    // check adjacent cell to see if connections line up
    // if connections line up pathfind in new cell 
    
    var cells = App.data.cells;
    var connectedCells = 0;
    
    // create an object to count how many times we've traversed a particular cell. If we've traversed
    // more than four times (the maximum number of paths available) then we're probably in an infinite
    // loop, so return (avoids exceeding maximum call stack errors)
    var breadcrumbs = {};
    
    // first loop through cells and reset status
    for (var x = 0; x < cells.length; x++) { cells[x].state &= ~1 } // bitwise clearing of status
    
    var pathfind = function(index, dir) {
        //console.log('pathfinding cell',index);
        
        var cell = cells[index];
        var paths = [];
        
        breadcrumbs[index] = breadcrumbs[index] || { count: 1 };
        if (breadcrumbs[index].count > 4) {
            //console.log('loop detected');
            cell.state |= 1; // mark connected
            connectedCells++;
            return;
        }
        breadcrumbs[index].count++;
        //console.log(breadcrumbs[index].count);
        
        // need to exclude the path we came from to avoid an infinite loop
        if ( dir != 'bottom' && 
             cell.connections & TOP && cell.top() != undefined && cell.top().connections & BOTTOM ) {
            paths.push('top');
        }
        
        if ( dir != 'left' && 
             cell.connections & RIGHT && cell.right() != undefined && cell.right().connections & LEFT ) {
            paths.push('right');
        }
        
        if ( dir != 'top' && 
             cell.connections & BOTTOM && cell.bottom() != undefined && cell.bottom().connections & TOP ) {
            paths.push('bottom');
        }
        
        if ( dir != 'right' && 
             cell.connections & LEFT && cell.left() != undefined && cell.left().connections & RIGHT ) {
            paths.push('left');
        }
        
        //console.log(paths);
        
        for(var x = 0; x < paths.length; x++) {
            pathfind(cell[paths[x]]().index, paths[x]);
        }
        
        cell.state |= 1; // mark connected
        connectedCells++;
    }
    
    //console.log('starting pathfind...');
    
    pathfind(App.data.serverIndex);
    
    //console.log('ending pathfind...');
    
    
    // set allConnected flag to true if all nodes are connected
    if (connectedCells == cells.length) {
        App.data.allConnected = true;
    }
    
    // loop through cell divs and add/remove 'connected' class
    App.data.gridDiv
        .children('.cell')
        .each(function(i, cellDiv) {
            
            var $cell = $(cellDiv);
            var cellIndex = $cell.attr('data-cellindex');
            var cell = App.data.cells[cellIndex];
            
            if (cell.state & 1) {
                $cell.addClass('connected');
            } else {
                $cell.removeClass('connected');
            }
            
         });
    
    
}; // updateConnections

App.drawGrid = function() {
    
    var $grid = App.data.gridDiv;

    var gridHeight = $grid.height();
    var gridWidth = $grid.width();
    var D = Math.floor(gridHeight / App.data.grid.height);
    
    //console.log('grid width:',gridWidth,'height:',gridHeight,'D:',D);
    
    // now set grid width
    $grid.css({
        'width': (App.data.grid.width * D) + 'px',
        'height': (App.data.grid.height * D) + 'px'
    });
    
    // we set height above because using Math.floor results in pixels left over at the
    // bottom of the grid. Adjusting the grid height removes those. However, to avoid
    // shifting the position of the footer we add a tiny shim that makes up those leftover
    // pixels.
    
    $('<div />')
        .css('height',(gridHeight - (App.data.grid.height * D)) + 'px')
        .insertAfter($grid);
    
    
    $.each(App.data.cells, function(i, cell) {
        
        var $div =
        $('<div />')
            .addClass('cell')
            .attr({
                'data-cellindex':   i,
                'data-alignment':   cell.nodeType ? cell.alignment : 0
             })
            .css({
                width:              D + 'px',
                height:             D + 'px',
                position:           'relative'
                //background:           'url('+ App.data.nodeList[cell.nodeType].imgName +')'
             })
            .appendTo($grid);
        
        //var text = '';
        //if (cell.connections & TOP) text += 'TOP<br />';
        //if (cell.connections & RIGHT) text += 'RIGHT<br />';
        //if (cell.connections & BOTTOM) text += 'BOTTOM<br />';
        //if (cell.connections & LEFT) text += 'LEFT<br />';
        //$div.append('<p>' + text + '</p>');
        
        /*
        */
        if (cell.nodeType > 0) {
            $('<img />')
                .attr({
                    src:    'img/' + App.data.nodeList[cell.nodeType].imgName
                    //title:    text
                })
                .appendTo($div);
        }
        
        $div
            .css({
                '-webkit-transform':'rotate('+ cell.alignment +'deg)'
             });
        
    });
    
    
}; // drawGrid

App.rotateCellDiv = function($cell) {
    // clockwise rotation
    //var alignment = parseInt($(this).attr('data-alignment'));
    var alignment = App.data.cells[$cell.attr('data-cellindex')].alignment;
    
    //console.log('Current alignment',alignment);
    
    alignment += 90;
    if (alignment > 300) alignment = 0;
    $cell.attr('data-alignment',alignment);
    
    //console.log('Rotating to',alignment);
    
    $cell
        .css({
            webkitAnimationName:    'rotation' + alignment,
            '-webkit-transform':    'rotate('+ alignment +'deg)'
         });
    
    // we also have to rotate the cell's connections clockwise
    App.rotateCell($cell.attr('data-cellindex'));
    
}; // rotateCellDiv

App.rotateCell = function(cellIndex) {
    
    //console.log('Rotating cell',cellIndex);
    
    var cell = App.data.cells[cellIndex];
    
    // rotate the cell connections with a bitwise left shift.
    
    //console.log('Current connections',cell.connections);
    
    cell.connections = cell.connections << 1;
    
    // wrap the leftmost bit if it shifted to bit 5 (16)
    if (cell.connections > 15) {
        cell.connections -= 16;
        cell.connections = cell.connections | 1;
    }
    
    //console.log('Rotated connections',cell.connections);
    
    // also update cell alignment with rotation
    cell.alignment += 90;
    if (cell.alignment > 300) cell.alignment = 0;

    
}; // rotateCell

App.getAlignment = function(start, end) {
    // returns the alignment in 90 degree increments
    // assuming start has an alignment of 0
    // will return false if start and end do not match
    // after four rotations
    // WARNING - MUST USE === TO CHECK FOR FAILURE
    
    //console.log('getting alignment for',start,end);
    
    var rotations = 0;
    var alignment = 0;
    
    while (start != end || rotations < 4) {
        start <<= 1;
        
        // wrap the leftmost bit if it shifted to bit 5 (16)
        if (start > 15) {
            start -= 16;
            start = start | 1;
        }
        
        // also update cell alignment with rotation
        alignment += 90;
        if (alignment > 300) alignment = 0;
        
        rotations++;
    }
    
    return start === end ? alignment: false;
    
}; // getAlignment

App.setNodeTypes = function() {
    // go through cells and assign the proper nodeType
    // also need to figure out node alignment
    
    $.each(
        App.data.cells,
        function(cellIndex, cell) {
            
            // determine how many connections this cell has
            var c = 0;
            if (cell.connections & TOP) c++;
            if (cell.connections & RIGHT) c++;
            if (cell.connections & BOTTOM) c++;
            if (cell.connections & LEFT) c++;
            
            //console.log('Connections on cell',cellIndex,'-',c);

            // assign the appropriate connector
            // note that nodeType will be either -1 or -2 at this point
            switch(c) {
                case 1:
                    cell.nodeType = cell.nodeType == -1 ?  1: 10;
                break;
                
                case 2:
                    // if there are two connections, determine if it's 
                    // an elbow or a straight connector
                    if (cell.connections == 5 || cell.connections == 10) {
                        // straight connector (vertical = 5, horizontal = 10)
                        cell.nodeType = cell.nodeType == -1 ?  3: 11;
                    } else {
                        // elbow
                        cell.nodeType = cell.nodeType == -1 ?  2: 12;
                    }
                break;
                
                case 3:
                    cell.nodeType = cell.nodeType == -1 ?  4: 13;
                break;
                
                case 4:
                    cell.nodeType = cell.nodeType == -1 ?  5: 14;
                break;
            } // switch
            
            //console.log('setting nodeType to',cell.nodeType);
            
            // align the node according to the cell connections
            alignment = App.getAlignment(App.data.nodeList[cell.nodeType].connections, cell.connections);
            if (alignment === false) {
                throw 'Error - Cell '+ cellIndex +' cannot be properly aligned.';
            } else {
                cell.alignment = alignment;
            }
            
        } // function
    );
    
}; // setNodeTypes





