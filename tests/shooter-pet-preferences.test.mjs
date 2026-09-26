import assert from 'node:assert/strict';
import test from 'node:test';
import {DEFAULT_PET_PREFERENCES, getPetLayoutKey, getPetPlacement, normalizePetPosition, normalizePetPreferences} from '../src/shooter/petPreferences.js';
import {createPetAnimation, drawPetFrame} from '../src/shooter/petAnimation.js';
import {SHOOTER_SPRITE_PETS} from '../src/shooter/pets.js';

test('pet settings default to half speed and left, with bounded saved preferences', () => {
 assert.equal(DEFAULT_PET_PREFERENCES.speed,.5);
 assert.equal(DEFAULT_PET_PREFERENCES.facing,'left');
 assert.deepEqual(normalizePetPreferences(null),DEFAULT_PET_PREFERENCES);
 const value=normalizePetPreferences({speed:100,facing:'right',positions:{'mobile-portrait':{x:-1,y:2},'desktop-portrait':{x:NaN,y:.5}}});
 assert.equal(value.speed,1);assert.equal(value.facing,'right');
 assert.deepEqual(value.positions,{'mobile-portrait':{x:0,y:1}});
 assert.equal(normalizePetPreferences({speed:-3}).speed,.25);
 assert.notEqual(getPetLayoutKey(true,false),getPetLayoutKey(false,false));
 assert.notEqual(getPetLayoutKey(true,false),getPetLayoutKey(true,true));
});

test('default pet is centered eight pixels above hearts, and manual placement scales within the arena', () => {
 const frame={width:390,height:720,size:64,mobile:true,horizontal:false,hearts:{x:256,y:664,width:124}};
 assert.deepEqual(getPetPlacement(frame),{x:286,y:592});
 const position=normalizePetPosition({x:150,y:260},390,720,64);
 assert.deepEqual(getPetPlacement({...frame,position}),{x:150,y:260});
 const resized=getPetPlacement({...frame,width:360,height:640,position});
 assert.ok(resized.x>8&&resized.x+64<360);assert.ok(resized.y>8&&resized.y+64<640);
 assert.deepEqual(getPetPlacement({...frame,position:{x:10,y:-3}}),{x:318,y:8});
 assert.deepEqual(getPetPlacement({...frame,position:null}),{x:286,y:592});
});

test('playback multiplier slows authored frames without changing the manifest or event order', () => {
 const pet=SHOOTER_SPRITE_PETS[0], original=JSON.stringify(pet.actions), player=createPetAnimation(pet.actions);
 player.react(2);
 const halfSpeed=.5;
 assert.equal(player.advance(1000/7*halfSpeed).frame,0);
 assert.equal(player.advance(1000/7*halfSpeed).frame,1);
 const event=player.advance(7000/7);
 assert.equal(event.name,'happy_roll');assert.equal(event.frame,0);
 assert.equal(JSON.stringify(pet.actions),original);
});

test('left facing mirrors the rendering transform then restores it without changing pixels on disk', () => {
 const calls=[],ctx=Object.fromEntries(['clearRect','save','translate','scale','drawImage','restore'].map(name=>[name,(...args)=>calls.push([name,...args])]));
 const pet=SHOOTER_SPRITE_PETS[0],image={};
 drawPetFrame(ctx,image,pet.geometry,{frame:2,row:1},192,'left');
 assert.deepEqual(calls,[['clearRect',0,0,192,192],['save'],['translate',192,0],['scale',-1,1],['drawImage',image,512,256,256,256,0,0,192,192],['restore']]);
});
