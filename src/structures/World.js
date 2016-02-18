import THREE from 'three';
import Voronoi from 'voronoi';
import SimplexNoise from 'simplex-noise';
import { find, times, sortBy, values } from 'lodash';

import Area from 'structures/Area';

export default class World {
	constructor(width=256, height=256, nodes=3) {
		this.width = width;
		this.height = height;

		this.nodes = _.times(nodes, (i) => {
			return {
				x: Math.random() * width - width / 2, 
				y: Math.random() * height - height / 2
			};
		});
		
		this._mesh = new THREE.Object3D();
		this._simplex = new SimplexNoise();
		this._voronoi = new Voronoi();
		this._diagram = null;

		this._computeVoronoi(this.nodes);

		times(4, () => {
			this.nodes = this._relaxNodes(this._diagram);
			this._computeVoronoi(this.nodes);
		})

		this._markVertices(this._diagram);
		this._areas = this._createAreas(this._diagram);
		this._setAreaNeighbors(this._diagram, this._areas);
		this._createRiver(this._diagram, this._areas);
		this._createAreaTriangles(this._diagram, this._areas);
		this._createAreaBorders(this._diagram, this._areas);

		values(this._areas).forEach(area => {
			this._mesh.add(area.mesh);
		});
	}

	get mesh() {
		return this._mesh;
	}

	_relaxNodes(diagram) {
		let nodes = [];

		diagram.cells.forEach(cell => {
			let polygon = new Polygon(cell.halfedges.map(halfedge => halfedge.getStartpoint()));
			nodes.push(polygon.center());
		});

		return nodes;
	}

	_computeVoronoi(nodes) {
		let bbox = { 
			xl: this.width / -2, xr: this.width / 2, 
			yt: this.height / -2, yb: this.height / 2 
		};

		if(this._diagram) {
			this._voronoi.recycle(this._diagram);
		}

		this._diagram = this._voronoi.compute(nodes, bbox);
	}

	_markVertices(diagram) {
		diagram.vertices.forEach((vert, i) => {
			vert.id = i;
		});
	}

	_createAreas(diagram) {
		let areas = {};

		this._diagram.cells.forEach(cell => {
			let height = this._simplex.noise2D(cell.site.x/400, cell.site.y/400) * 24;
			let area = new Area(cell, height);
			areas[area.id] = area;
		});

		return areas;
	}

	_setAreaNeighbors(diagram, areas) {
		diagram.cells.forEach(cell => {
			cell.halfedges.forEach(halfedge => {
				if(halfedge.edge.rSite === null) {
					return;
				}

				let lSite = areas[halfedge.edge.lSite.voronoiId];
				let rSite = areas[halfedge.edge.rSite.voronoiId];

				lSite.addNeighbor(rSite);
				rSite.addNeighbor(lSite);
			});
		})
	}

	_createRiver(diagram, areas) {
		areas = sortBy(areas, (area) => {
			if(Math.abs(area.center.y) > this.height/2 - this.height / 2.5) {
				return -1;
			}

			return area.center.x;
		});

		let currentArea = areas[0];

		while(currentArea !== null) {
			let neighbors = currentArea.neighbors;
			let id = currentArea.id;
			currentArea.height = -32;

			values(neighbors).forEach(neighbor => {
				if(Math.abs(neighbor.center.y) > this.height/2 - this.height / 5) {
					return;
				}

				if(neighbor.center.x > currentArea.center.x || Math.random() < 0.9) {
					currentArea = neighbor;

				}
			});

			if(currentArea.id === id) {
				break;
			}
		}
	}

	_createAreaTriangles(diagram, areas) {
		diagram.vertices.forEach(vert => {

			let points = [];

			values(areas).forEach(area => {
				area._polygon.points.forEach(point => {
					if(point.id === vert.id) {
						points.push(point);
					}
				})
			});

			if(points.length === 3) {
				let polygon = new Polygon(points);
				polygon.rewind(true);

				let geometry = new THREE.Geometry();
				// let material = new THREE.MeshBasicMaterial({ color: '#'+(Math.random()*0xFFFFFF<<0).toString(16), wireframe: false });
				let material = new THREE.MeshNormalMaterial({ wireframe: false });

				polygon.points.forEach(point => {
					geometry.vertices.push(new THREE.Vector3(point.x, point.z, point.y));
				});

				geometry.faces.push(new THREE.Face3(0, 1, 2));

				geometry.computeFaceNormals();
				geometry.computeVertexNormals(); 

				this._mesh.add(new THREE.Mesh(geometry, material));
			}
		});
	}

	_createAreaBorders(diagram, areas) {
		diagram.edges.forEach(edge => {
			if(edge.rSite === null) {
				return;
			}

			let lArea = areas[edge.lSite.voronoiId];
			let rArea = areas[edge.rSite.voronoiId];

			let lAreaVa = find(lArea._polygon.points, { id: edge.va.id });
			let lAreaVb = find(lArea._polygon.points, { id: edge.vb.id });
			let rAreaVa = find(rArea._polygon.points, { id: edge.va.id });
			let rAreaVb = find(rArea._polygon.points, { id: edge.vb.id });

			let geometry = new THREE.Geometry();
			// let material = new THREE.MeshBasicMaterial({ color: '#'+(Math.random()*0xFFFFFF<<0).toString(16), wireframe: false });
			let material = new THREE.MeshNormalMaterial({ wireframe: false });

			let polygonA = new Polygon([lAreaVa, rAreaVa, lAreaVb]);
			polygonA.rewind(true);
			polygonA.points.forEach(point => {
				geometry.vertices.push(new THREE.Vector3(point.x, point.z, point.y));
			});
			geometry.faces.push(new THREE.Face3(0, 1, 2));

			let polygonB = new Polygon([rAreaVa, rAreaVb, lAreaVb]);
			polygonB.rewind(true);
			polygonB.points.forEach(point => {
				geometry.vertices.push(new THREE.Vector3(point.x, point.z, point.y));
			});
			geometry.faces.push(new THREE.Face3(3, 4, 5));

			geometry.computeFaceNormals();
			geometry.computeVertexNormals(); 	

			this._mesh.add(new THREE.Mesh(geometry, material));
		});
	}
}