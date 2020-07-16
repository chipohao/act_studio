import ViewStep from '@zonesoundcreative/view-step';
import $ from 'jquery';
import Player from '@zonesoundcreative/web-player';
import {enableRef, startTimeRef, intervalRef, lengthRef, connectRef, percentRef} from './firebase';
import NoSleep from 'nosleep.js';
import testSound from './test.mp3';

let enable, startTime, interval, length, connect = {}, percent = {};
let playerNum = 1;
let playerid = 0;
let player = new Player(testSound);
var noSleep = new NoSleep();
let viewStep = new ViewStep('.step', 1, 2, {
    2: initSoundList
});

$('#start').click(function() {
    viewStep.showNext();
})

$('.players').click(function() {
    noSleep.enable();
    playerid = $(this).attr('id').split('-')[1]
    playerStart();
    
})

function playerStart() {
    $('.players').attr('disabled', true);
    //connectRef.child(playerid).set(connect[playerid]+1);
    updateConnect(1);
    if (player.loaded) { //change to self player

        let now = Date.now();
        let calc = ((now-startTime)/1000)%(length+interval);
        if (calc < length){
            console.log('play');
            player.play(calc);
            setTimeout(()=>{
                noSleep.disable();
                console.log('end!');
                updateConnect(-1);
                playerid = 0;
            }, (length-calc)*1000);
        } else {
            console.log('wait and play');
            setTimeout(()=>{
                player.play(0);
            }, (length+interval-calc)*1000);
        }
    }
}


function initSoundList() {
    console.log('initSoundList', player.loaded);
    //connect to socket and 
    // ask socket which sound is available
}

enableRef.on('value', (snapshot) => {
    enable = snapshot.val();
    if (enable) console.log('true!');
    console.log('enable', snapshot.val());
});

startTimeRef.on('value', (snapshot) => {
    startTime = snapshot.val();
    console.log('startTime', snapshot.val());
});

intervalRef.on('value', (snapshot) => {
    interval = snapshot.val();
    console.log('interval', snapshot.val());
});

lengthRef.on('value', (snapshot) => {
    length = snapshot.val();
    console.log('length', snapshot.val());
});

percentRef.on('value', (pr) => {
    pr.forEach((e)=>{
        percent[e.key] = e.val();
        //console.log(e, e.key);
    });
    console.log('percent', percent);
});

connectRef.on('value', (cr) => {
    if (playerid == 0) return;
    let total = 0;
    cr.forEach((e)=>{
        total += e.val();
        connect[e.key] = e.val();
        //console.log(e, e.key);
    });
    if (total == 0) return;
    cr.forEach((e)=>{
        if (parseInt(e.val())/total > percent[e.key]) {
            console.log(e.key, true);
            $("#player-"+e.key).attr('disabled', true);
        } else {
            console.log(e.key, false);
            $("#player-"+e.key).attr('disabled', false);
        }
    })
});

$(window).bind("beforeunload", function() { 
    if (playerid) updateConnect(-1);
    //return inFormOrLink ? "Do you really want to close?" : null; 
})

window.onbeforeunload = function () {
    return "Are you sure?";
}

function updateConnect(off){
    connectRef.child(playerid).transaction(function (current_value) {
        return (current_value || 0) + off;
    });
}