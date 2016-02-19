import THREE from 'three';
import Polygon from 'polygon';

import TerrainMaterial from 'materials/Terrain';

export default class Area {
	constructor(world, cell, height) {
		this.world = world;
		this._id = cell.site.voronoiId;
		this._cell = cell;

		let points = cell.halfedges.map(halfedge => halfedge.getStartpoint());
		this._polygon = new Polygon(points);


		// ensure that every point has its id
		points.forEach((point, i) => {
			this._polygon.points[i].id = point.id;
		});

		this.height = height;

		this._polygon.rewind(true);
		this._polygon.scale(1 - (Math.random() / 1.5 + 0.1));

		this._neighbors = {};
	}

	get id() {
		return this._id;
	}

	get polygon() {
		return this._polygon;
	}

	get center() {
		return this._polygon.center();
	}

	get neighbors() {
		return this._neighbors;
	}

	get height() {
		return this._height;
	}

	set height(height) {
		this._height = height;

		let points = this._cell.halfedges.map(halfedge => halfedge.getStartpoint());
		points.forEach((point, i) => {
			// this._polygon.points[i].z = this._height;
			this._polygon.points[i].z = this._height + this.world._simplex.noise2D(point.x/2048, point.y/1024) * 96;
		});
	}

	get mesh() {
		let geometry = new THREE.Geometry();

		this._polygon.points.forEach(point => {
			geometry.vertices.push(new THREE.Vector3(point.x, point.z, point.y));
		});
		
		for(let i = 0; i < this._polygon.points.length - 2; i++) {
			geometry.faces.push(new THREE.Face3(0, i + 1, i + 2));
		}

		geometry.computeFaceNormals();
		geometry.computeVertexNormals(); 	

		return new THREE.Mesh(geometry, null);
	}

	addNeighbor(neighbor) {
		this._neighbors[neighbor.id] = neighbor;
	}
}