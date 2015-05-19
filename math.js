function getBodyFromGeometry(geometry, scale_x, scale_y, scale_z) {
	var scale_x = scale_x || 1;
	var scale_y = scale_y || 1;
	var scale_z = scale_z || 1;

	var verts = [], faces = [];

	// Get vertices
	for (var j = 0; j < geometry.vertices.length; j++) {
		verts.push(new CANNON.Vec3(geometry.vertices[j].x * scale_x, geometry.vertices[j].y * scale_y, geometry.vertices[j].z * scale_z));
	}

	// Get faces
	for (var j = 0; j < geometry.faces.length; j++) {
		faces.push([geometry.faces[j].a, geometry.faces[j].b, geometry.faces[j].c]);
	}

	// Construct polyhedron
	return new CANNON.ConvexPolyhedron(verts, faces);
}

function getMeshFromBody(body) {
	var geometry = new THREE.Geometry();
	for (var i = 0; i < body.shapes.length; i++) {
		var s = body.shapes[i];
		for (var j = 0; j < s.vertices.length; j++) {
			var v = s.vertices[j];
			geometry.vertices.push(new THREE.Vector3(v.x, v.y, v.z));

		}
		for (var j = 0; j < s.faces.length; j++) {
			var f = s.faces[j];
			geometry.faces.push(new THREE.Face3(f[0], f[1], f[2]));
		}
	}

	var material = new THREE.MeshBasicMaterial({
		color : 0x00ff00,
		wireframe : true,
	});

	// var geometry = new THREE.BoxGeometry( 1, 1, 1 );
	var wire = new THREE.Mesh(geometry, material);
	// wire.scale.set(1.01,1.01,1.01);
	scene.add(wire);
	return wire;
}

function clip_face_with_geometry(pattern_geometry, world_matrix, pattern_face, mesh_to_clip) {
	// Get face normal and put it in world coords
	var face_normal = pattern_face.normal.clone();
	var pattern_normal_matrix = new THREE.Matrix3().getNormalMatrix(world_matrix);
	face_normal.applyMatrix3(pattern_normal_matrix).normalize();

	var mesh_normal_matrix = new THREE.Matrix3().getNormalMatrix(mesh_to_clip.matrixWorld);

	// Get one vertex of the face and put it in world coords
	var face_point = pattern_geometry.vertices[pattern_face.a].clone();
	fracturePattern.localToWorld(face_point);

	// Initialize variables
	var mesh_vertices = mesh_to_clip.geometry.vertices;
	var mesh_face_vertices = [], mesh_face_vertices_to_discard = [];
	var dot_product;
	var index;

	var temp_vector = new THREE.Vector3();
	var origin = new THREE.Vector3(), direction = new THREE.Vector3(), intersection = new THREE.Vector3();
	var edge1 = new THREE.Vector3(), edge2 = new THREE.Vector3();

	var t;

	var triangles = [];
	var new_vertices = [];

	mesh_to_clip.geometry.faces.forEach(function (mesh_face) {
		// Get the normal of this face
		var mesh_face_normal = mesh_face.normal.clone();
		mesh_face_normal.applyMatrix3(mesh_normal_matrix).normalize();

		mesh_face_vertices = [];
		mesh_face_vertices_to_discard = [];

		// Get vertices from this face
		mesh_face_vertices.push(mesh_vertices[mesh_face.a].clone());
		mesh_face_vertices.push(mesh_vertices[mesh_face.b].clone());
		mesh_face_vertices.push(mesh_vertices[mesh_face.c].clone());

		mesh_face_vertices.forEach(function (vertex) {
			// Put vertex in world coordinates
			mesh_to_clip.localToWorld(vertex);

			// Set temp_vector to vertex - point of plane
			temp_vector.copy(vertex);
			temp_vector.sub(face_point);

			dot_product = temp_vector.dot(face_normal);

			// If this vertex is in the wrong side, put it in the vertices to discard array
			if (dot_product < 0) {
				mesh_face_vertices_to_discard.push(vertex);
			}
		});

		// Delete vertices to discard from list of vertices
		mesh_face_vertices_to_discard.forEach(function (vertex) {
			index = mesh_face_vertices.indexOf(vertex);
			mesh_face_vertices.splice(index, 1);
		});

		// If we have only 1 vertex left
		if (mesh_face_vertices.length == 1) {
			origin.copy(mesh_face_vertices[0]);

			// Get intersection of triangles and add them to list of vertices
			mesh_face_vertices_to_discard.forEach(function (vertex) {

				direction.subVectors(vertex, origin);
				temp_vector.subVectors(face_point, origin);
				t = temp_vector.dot(face_normal);
				t = t / (direction.dot(face_normal));

				direction.multiplyScalar(t);

				intersection = new THREE.Vector3();
				intersection.addVectors(origin, direction);

				mesh_face_vertices.push(intersection);
				new_vertices = add_to_array_unique(new_vertices, intersection);
			});

			edge1.copy(mesh_face_vertices[1]);
			edge2.copy(mesh_face_vertices[2]);
			edge1.sub(mesh_face_vertices[0]);
			edge2.sub(mesh_face_vertices[0]);

			temp_vector.crossVectors(edge1, edge2);

			// Add vertices in correct order
			if (temp_vector.dot(mesh_face_normal) > 0) {
				triangles.push([mesh_face_vertices[0].clone(), mesh_face_vertices[1].clone(), mesh_face_vertices[2].clone()]);
			} else {
				triangles.push([mesh_face_vertices[0].clone(), mesh_face_vertices[2].clone(), mesh_face_vertices[1].clone()]);
			}
		}

		// If we have 2 vertices left
		else if (mesh_face_vertices.length == 2) {
			origin.copy(mesh_face_vertices_to_discard[0]);
			mesh_face_vertices.forEach(function (vertex) {
				direction.subVectors(vertex, origin);
				temp_vector.subVectors(face_point, origin);
				t = temp_vector.dot(face_normal);
				t = t / (direction.dot(face_normal));

				direction.multiplyScalar(t);

				intersection = new THREE.Vector3();
				intersection.addVectors(origin, direction);

				mesh_face_vertices.push(intersection);
				new_vertices = add_to_array_unique(new_vertices, intersection);
			});

			edge1.copy(mesh_face_vertices[1]);
			edge2.copy(mesh_face_vertices[2]);
			edge1.sub(mesh_face_vertices[0]);
			edge2.sub(mesh_face_vertices[0]);

			temp_vector.crossVectors(edge1, edge2);

			// Add vertices in correct order
			if (temp_vector.dot(mesh_face_normal) > 0) {
				triangles.push([mesh_face_vertices[0].clone(), mesh_face_vertices[1].clone(), mesh_face_vertices[2].clone()]);
			} else {
				triangles.push([mesh_face_vertices[0].clone(), mesh_face_vertices[2].clone(), mesh_face_vertices[1].clone()]);
			}

			edge1.copy(mesh_face_vertices[3]);
			edge2.copy(mesh_face_vertices[2]);
			edge1.sub(mesh_face_vertices[1]);
			edge2.sub(mesh_face_vertices[1]);

			temp_vector.crossVectors(edge1, edge2);

			// Add vertices in correct order (this time we have 4 vertices, so 2 triangles)
			if (temp_vector.dot(mesh_face_normal) > 0) {
				triangles.push([mesh_face_vertices[1].clone(), mesh_face_vertices[3].clone(), mesh_face_vertices[2].clone()]);
			} else {
				triangles.push([mesh_face_vertices[1].clone(), mesh_face_vertices[2].clone(), mesh_face_vertices[3].clone()]);
			}
		}

		// If all the vertices are on the right side
		else if (mesh_face_vertices.length == 3) {
			triangles.push([mesh_face_vertices[0].clone(), mesh_face_vertices[1].clone(), mesh_face_vertices[2].clone()]);
		}
	});

	if (new_vertices.length > 2) {
		edge1.copy(new_vertices[1]);
		edge1.sub(new_vertices[0]);

		var angle, cross_norm, dot;
		var new_vertices_angles = [];

		new_vertices_angles.push([0, new_vertices[1].clone()]);

		for (var i = 2; i < new_vertices.length; i++) {
			edge2.copy(new_vertices[i]);
			edge2.sub(new_vertices[0]);

			temp_vector.crossVectors(edge1, edge2);
			cross_norm = temp_vector.length();
			dot = edge1.dot(edge2);

			angle = Math.atan2(cross_norm, dot);

			new_vertices_angles.push([angle, new_vertices[i].clone()]);
		}

		new_vertices_angles = new_vertices_angles.sort(comparator);

		edge1.copy(new_vertices_angles[0][1]);
		edge1.sub(new_vertices[0]);
		edge2.copy(new_vertices_angles[1][1]);
		edge1.sub(new_vertices[0]);

		temp_vector.crossVectors(edge1, edge2);

		var order;

		if (temp_vector.dot(face_normal) > 0) {
			order = true;
		} else {
			order = false;
		}

		for (var i = 0; i < new_vertices_angles.length - 1; i++) {
			if (order === true) {
				triangles.push([new_vertices[0].clone(), new_vertices_angles[i][1].clone(), new_vertices_angles[i+1][1].clone()]);
			} else {
				triangles.push([new_vertices[0].clone(), new_vertices_angles[i+1][1].clone(), new_vertices_angles[i][1].clone()]);
			}
		}
	}

	return triangles;
}

function comparator(a, b) {
	if (a[0] < b[0])
		return -1;
	if (a[0] > b[0])
		return 1;
	return 0;
}

function create_mesh(triangles) {

	var new_vertices = [];

	// Add unique vertices to new_vertices
	triangles.forEach(function (triangle_vertices) {
		triangle_vertices.forEach(function (vertex) {
			new_vertices = add_to_array_unique(new_vertices, vertex);
		});
	});

	var material = new THREE.MeshPhongMaterial({
		color : 0xff0000,
		side : THREE.DoubleSide,
		// wireframe : true
	});
	var hue = Math.random();
	material.color.setHSL(hue, 1, 0.5);

	var geometry = new THREE.Geometry();

	geometry.vertices = new_vertices;

	var index0, index1, index2;

	// Find face indices and add faces to geometry
	triangles.forEach(function (triangle_vertices) {
		new_vertices.forEach(function (new_vertex) {
			if (triangle_vertices[0].equals(new_vertex)) {
				index0 = new_vertices.indexOf(new_vertex);
			}
			if (triangle_vertices[1].equals(new_vertex)) {
				index1 = new_vertices.indexOf(new_vertex);
			}
			if (triangle_vertices[2].equals(new_vertex)) {
				index2 = new_vertices.indexOf(new_vertex);
			}
		});

		geometry.faces.push(new THREE.Face3(index0, index1, index2));
	});

	geometry.computeFaceNormals();

	var mesh = new THREE.Mesh(geometry, material);

	return mesh;
}

// Changes a mesh's center to be its center of mass
function recenterMesh(mesh) {
	var center = new THREE.Vector3();
	var verts = mesh.geometry.vertices;
	var len = verts.length;

	for (var i = 0; i < len; i++) {
		center.add(verts[i]);
	}
	center.divideScalar(len);

	// for (var i = 0; i < len; i++) {
	// 	verts[i].sub(center);
	// }
	
	// mesh.position.add(center);

	return center;

}

function scaleMeshGeometry(mesh, scale) {
	var verts = mesh.geometry.vertices;
	for (var i = 0; i < verts.length; i++) {
		verts[i].multiplyScalar(scale);
	}
}

function add_to_array_unique(array, vector3) {
	vector3 = clamp(vector3, 4);

	var found = false;
	array.forEach(function (value) {
		if (value.equals(vector3)) {
			found = true;
		}
	});

	if (found === false) {
		array.push(vector3);
	}

	return array;
}

function clamp(vertex, digits) {
	vertex.x = Number((vertex.x).toFixed(digits));
	vertex.y = Number((vertex.y).toFixed(digits));
	vertex.z = Number((vertex.z).toFixed(digits));

	return vertex;
}

// This function creates a virtual movement plane for the mouseJoint to move in
function setScreenPerpCenter(point, camera) {
	// If it does not exist, create a new one
	if (!gplane) {
		var planeGeo = new THREE.PlaneGeometry(100, 100);
		var plane = gplane = new THREE.Mesh(planeGeo, material);
		plane.visible = false;
		// Hide it..
		plane.name = "invisible movement plane for mousejoint";
		scene.add(gplane);
	}

	// Center at mouse position
	gplane.position.copy(point);

	// Make it face toward the camera
	gplane.quaternion.copy(camera.quaternion);
}

function projectOntoPlane(screenX, screenY, thePlane, camera) {
	var x = screenX;
	var y = screenY;
	var now = new Date().getTime();
	// project mouse to that plane
	var hit = findNearestIntersectingObject(screenX, screenY, camera, [thePlane]);
	// [thePlane]);
	lastx = x;
	lasty = y;
	last = now;
	if (hit) {
		return hit.point;
	}
	return false;
}

function findNearestIntersectingObject(clientX, clientY, camera, objects) {
	// Get the picking ray from the point
	var raycaster = getRayCasterFromScreenCoord(clientX, clientY, camera, projector);

	// Find the closest intersecting object
	// Now, cast the ray all render objects in the scene to see if they collide. Take the closest one.
	var hits = raycaster.intersectObjects(objects);
	var closest = false;
	if (hits.length > 0) {
		closest = hits[0];
	}

	return closest;
}

// Function that returns a raycaster to use to find intersecting objects
// in a scene given screen pos and a camera, and a projector
function getRayCasterFromScreenCoord(screenX, screenY, camera, projector) {
	var mouse3D = new THREE.Vector3();
	// Get 3D point form the client x y
	mouse3D.x = (screenX / window.innerWidth) * 2 - 1;
	mouse3D.y = -(screenY / window.innerHeight) * 2 + 1;
	mouse3D.z = 0.5;
	return projector.pickingRay(mouse3D, camera);
}