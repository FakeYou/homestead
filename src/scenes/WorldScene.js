import THREE from 'three';
import AbstractScene from 'scenes/AbstractScene';

import Surface from 'factories/Surface';

export default class WorldScene extends AbstractScene {
  constructor(){
    super();

    this._camera.position.y = 200;

    let surface = new Surface();
    this._scene.add(surface.mesh);

    this.animate();
  }
}