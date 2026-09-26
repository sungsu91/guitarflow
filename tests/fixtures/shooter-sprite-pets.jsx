import React, { useState } from 'react';
import {createRoot} from 'react-dom/client';
import ShooterSpritePet from '../../src/shooter/ShooterSpritePet.jsx';
import {SHOOTER_SPRITE_PETS} from '../../src/shooter/pets.js';
function Fixture() {
 // This fixture audits original authored frames. Preferences are tested in the real app.
 const [props,setProps] = useState({skin:SHOOTER_SPRITE_PETS[0],mobile:true,horizontal:false,active:true,playing:true,score:0,hits:0,combo:0,playbackSpeed:1,facing:'right'});
 window.petFixture = patch => setProps(old=>({...old,...patch,...(patch.id?{skin:SHOOTER_SPRITE_PETS.find(p=>p.id===patch.id)}:{})}));
 return <div style={{position:'relative',width:'100vw',height:'100vh'}}><ShooterSpritePet {...props}/></div>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
