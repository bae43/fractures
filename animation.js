function moveFracturePattern(x, y, z) {
	fracturePattern.visible = true;
	// fracturesNormalsHelper.visible = true;
	fracturePattern.position.set(x, y, z);
}

function removeFracturePattern() {
	if (fracturePattern) {
		fracturePattern.visible = false;
	}
}

function onMouseMove(e) {

	var entity = findNearestIntersectingObject(e.clientX, e.clientY, camera, meshes);

	if (entity) {
		var pos = entity.point;
		setScreenPerpCenter(pos, camera);
		$('html').css('cursor', 'none');

		// Move and project on the plane
		if (gplane) {
			var pos = projectOntoPlane(e.clientX, e.clientY, gplane, camera);

			if (pos) {

				moveFracturePattern(pos.x, pos.y, pos.z, scene);
				// moveJointToPoint(pos.x, pos.y, pos.z);
			}
		}
	} else {
		removeFracturePattern();
		$('html').css('cursor', '');
	}
}

function onMouseDown(e) {
	// Find mesh from a ray
	var entity = findNearestIntersectingObject(e.clientX, e.clientY, camera, meshes);
	if (!entity) {
		return;
	}

	var pos = entity.point;

	var obj = entity.object;
	var bodybody = null;
	scene.remove(obj);

	// remove from meshes
	for (var i in meshes) {
		if (meshes[i] == obj) {

			meshes.splice(i, 1);
			world.remove(bodies[i]);

			bodies.splice(i, 1);
			scene.remove(meshNormals[i]);
			meshNormals.splice(i, 1);

			scene.remove(bodyWires[i]);
			bodyWires.splice(i, 1);

			break;
		}
	}

	for (var i = 0; i < fracturePatternCuts.length; i++) {

		var this_cut = fracturePatternCuts[i];
		var pattern_faces = this_cut.faces;

		var current_face;

		var triangles_inside;

		var mass = 5;

		var mesh_inside = obj;

		var no_triangles = false;

		for (var j = 0; j < pattern_faces.length; j++) {
			console.log(j);
			current_face = pattern_faces[j];

			var worldMatrix = fracturePattern.matrixWorld;
			triangles_inside = clip_face_with_geometry(this_cut, worldMatrix, current_face, mesh_inside);

			// do nothing if no intersection - do not create an empty mesh
			if (triangles_inside.length == 0) {

				console.log(fracturePatternCuts);
				console.log(current_face);

				no_triangles = true;
				break;
			}

			mesh_inside = create_mesh(triangles_inside);

		}

		if (no_triangles) {
			continue;
		}

		mesh_inside.castShadow = true;

		console.log(mesh_inside);

		meshes.push(mesh_inside);

		// Create bodies
		var shape = getBodyFromGeometry(mesh_inside.geometry);
		var body_inside = new CANNON.Body({
			mass : mass
		});

		body_inside.addShape(shape);
		body_inside.position.copy(mesh_inside.position);
		// body_inside.position.y += 2;
		body_inside.quaternion.copy(mesh_inside.quaternion);

		world.add(body_inside);
		bodies.push(body_inside);
		scene.add(mesh_inside);

		bodyWires.push(getMeshFromBody(body_inside));
	}
	// facesMeshHelper = new THREE.FaceNormalsHelper( mesh_inside, 0.3 );
	// meshNormals.push(facesMeshHelper);
	// scene.add(facesMeshHelper);
}

function onMouseUp(e) {
	return;

	constraintDown = false;
	// remove the marker
	removeClickMarker();

	// Send the remove mouse joint to server
	// removeJointConstraint();
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	//controls.handleResize();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
	requestAnimationFrame(animate);
	//controls.update();
	updatePhysics();
	render();
}

function updatePhysics() {
	world.step(dt);
	for (var i = 0; i !== meshes.length; i++) {

		meshes[i].position.copy(bodies[i].position);
		meshes[i].quaternion.copy(bodies[i].quaternion);
		// meshNormals[i].update();

		bodyWires[i].position.copy(bodies[i].position);
		bodyWires[i].quaternion.copy(bodies[i].quaternion);
	}

	// fracturesNormalsHelper.update();
}

function render() {
	renderer.render(scene, camera);
}

function addMouseConstraint(x, y, z, body) {
	// The cannon body constrained by the mouse joint
	constrainedBody = body;

	// Vector to the clicked point, relative to the body
	var v1 = new CANNON.Vec3(x, y, z).vsub(constrainedBody.position);

	// Apply anti-quaternion to vector to tranform it into the local body coordinate system
	var antiRot = constrainedBody.quaternion.inverse();
	pivot = antiRot.vmult(v1);
	// pivot is not in local body coordinates

	// Move the cannon click marker particle to the click position
	jointBody.position.set(x, y, z);

	// Create a new constraint
	// The pivot for the jointBody is zero
	mouseConstraint = new CANNON.PointToPointConstraint(constrainedBody, pivot, jointBody, new CANNON.Vec3(0, 0, 0));

	// Add the constriant to world
	world.addConstraint(mouseConstraint);
}

// This functions moves the transparent joint body to a new postion in space
function moveJointToPoint(x, y, z) {
	// Move the joint body to a new position
	jointBody.position.set(x, y, z);
	mouseConstraint.update();
}

function removeJointConstraint() {
	// Remove constriant from world
	world.removeConstraint(mouseConstraint);
	mouseConstraint = false;
}

function onKeyDown(event) {
	var delta = 0.2;
	event = event || window.event;
	var keycode = event.keyCode;
	switch (keycode) {
		case 37 :
			// left arrow
			camera.position.z = camera.position.z + delta;
			break;
		case 38 :
			// up arrow
			camera.position.x = camera.position.x - delta;
			break;
		case 39 :
			// right arrow
			camera.position.z = camera.position.z - delta;
			break;
		case 40 :
			//down arrow
			camera.position.x = camera.position.x + delta;
			break;
		case 90 :
			//Z
			camera.position.y = camera.position.y + delta;
			break;
		case 83 :
			//S
			camera.position.y = camera.position.y - delta;
			break;
		case 81 :
			//Q
			camera.rotation.y = camera.rotation.y + delta / 10;
			break;
		case 68 :
			//D
			camera.rotation.y = camera.rotation.y - delta / 10;
			break;
	}
}