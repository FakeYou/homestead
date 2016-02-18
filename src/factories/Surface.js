import THREE from 'three';
import Voronoi from 'voronoi';
import Polygon from 'polygon';
import SimplexNoise from 'simplex-noise';
import { times } from 'lodash';

import World from 'structures/World';

export default class Surface {
	constructor(width=512, height=512, nodes=100) {
		this.width = width;
		this.height = height;

		this._mesh = new THREE.Object3D();

		this._geometry = new THREE.PlaneGeometry(width, height);
		this._material = new THREE.MeshNormalMaterial({ wireframe: true });

		this._plane = new THREE.Mesh(this._geometry, this._material);
		this._plane.rotation.x = Math.PI / 2;
		this._mesh.add(this._plane);

		this._world = new World(width, height, nodes);
		console.log(this._world);

		this._mesh.add(this._world.mesh);

		// this._simplex = new SimplexNoise();
		// this._diagram = this._computeVoronoi();
		// this._polygons = this._computePolygons();
		// this._displayNodeCenters();
		// this._displayPolygons();

		// console.log(this._diagram);
	}

	get mesh() {
		return this._mesh;
	}

	_displayNodeCenters() {
		let geometry = new THREE.SphereGeometry(1, 3, 2);
		let material = new THREE.MeshNormalMaterial();

		let mesh = new THREE.Mesh(geometry, material);

		this._nodes.forEach(node => {
			let _mesh = mesh.clone();
			_mesh.position.x = node.x;
			_mesh.position.z = node.y;

			this._mesh.add(_mesh);
		})
	}

	_displayPolygons() {
		this._polygons.forEach(polygon => {
			let material = new THREE.MeshBasicMaterial({ color: '#'+(Math.random()*0xFFFFFF<<0).toString(16), wireframe: true });
			let geometry = new THREE.Geometry();

			polygon = polygon.offset(-1);
			// polygon.scale(1 - (Math.random() / 8 + 0.05));

			let center = polygon.center();
			let z = this._simplex.noise2D(center.x, center.y) * 12;
			z = 0;

			polygon.points.forEach(point => {
				geometry.vertices.push(new THREE.Vector3(point.x, z, point.y));
			});
			
			for(let i = 0; i < polygon.points.length - 2; i++) {
				let face = new THREE.Face3(0, i + 1, i + 2);
				face.normal.z = 1;
				geometry.faces.push(face);
			}

			this._mesh.add(new THREE.Mesh(geometry, material));
		});
	}

	_computeVoronoi() {
		let voronoi = new Voronoi();
		let bbox = { 
			xl: this.width / -2, xr: this.width / 2, 
			yt: this.height / -2, yb: this.height / 2 
		};

		return voronoi.compute(this._nodes, bbox);
	}

	_computePolygons() {
		var polygons = [];


		this._diagram.cells.forEach(cell => {
			let points = cell.halfedges.map(halfedge => halfedge.getStartpoint());

			var polygon = new Polygon(points);
			polygon.rewind(true);
			polygons.push(polygon);

		});

		let areas = [];
		this._diagram.cells.forEach(cell => areas.push(new Area(this._diagram, cell)));
		console.log(areas);

		return polygons;
	}
}