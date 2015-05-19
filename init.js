function init() {
	projector = new THREE.Projector();

	container = document.getElementById('container');

	loader = new THREE.JSONLoader();

	// scene
	scene = new THREE.Scene();
	scene.fog = new THREE.Fog(0x000000, 500, 10000);

	// camera
	camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.5, 10000);
	camera.position.set(10, 2, 0);
	camera.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
	camera.name = "perspective camera";
	scene.add(camera);

	// controls = new THREE.TrackballControls( camera, renderer.domElement );

	// lights
	var materials;
	var temp_light = new THREE.AmbientLight(0x666666);
	temp_light.name = "ambient light";
	scene.add(temp_light);

	var light1 = create_directional_light(1.5, 20, 20, 20);
	light1.name = "directional light 1";
	scene.add(light1);

	// floor
	geometry = new THREE.PlaneGeometry(100, 100, 1, 1);
	//geometry.applyMatrix( new THREE.Matrix4().makeRotationX( -Math.PI / 2 ) );
	material = new THREE.MeshLambertMaterial({
		color : 0x777777
	});
	markerMaterial = new THREE.MeshLambertMaterial({
		color : 0xff0000,
		side : THREE.DoubleSide,
		transparent : true,
		opacity : 0.6,
	});
	//THREE.ColorUtils.adjustHSV( material.color, 0, 0, 0.9 );
	mesh = new THREE.Mesh(geometry, material);
	mesh.castShadow = true;
	mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
	mesh.receiveShadow = true;

	mesh.name = 'ground plane';
	scene.add(mesh);

	setScene('Cubes');
	setFracturePattern('Plane');

	renderer = new THREE.WebGLRenderer({
		antialias : true
	});
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(scene.fog.color);

	container.appendChild(renderer.domElement);

	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	renderer.shadowMapEnabled = true;

	window.addEventListener('resize', onWindowResize, false);
	window.addEventListener('mousemove', onMouseMove, false);
	window.addEventListener('mousedown', onMouseDown, false);
	window.addEventListener('mouseup', onMouseUp, false);
	window.addEventListener('keydown', onKeyDown, false);
}

function initCannon() {
	// Setup our world
	world = new CANNON.World();
	world.quatNormalizeSkip = 0;
	world.quatNormalizeFast = false;

	world.gravity.set(0, -10, 0);
	world.broadphase = new CANNON.NaiveBroadphase();
	world.solver.iterations = 50;
	world.solver.tolerance = 0.001

	// Create a plane
	var groundShape = new CANNON.Plane();
	var groundBody = new CANNON.Body({
		mass : 0
	});
	groundBody.addShape(groundShape);
	groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);

	groundBody.name = "ground plane body";
	world.add(groundBody);

	// Joint body
	// var shape = new CANNON.Sphere(0.1);
	// jointBody = new CANNON.Body({
	// mass : 0
	// });
	// jointBody.addShape(shape);
	// jointBody.collisionFilterGroup = 0;
	// jointBody.collisionFilterMask = 0;
	// world.add(jointBody)
}

function create_directional_light(strength, x, y, z) {
	var light = new THREE.DirectionalLight(0xffffff, strength);
	var d = 20;

	light.position.set(x, y, z);

	light.castShadow = true;
	//light.shadowCameraVisible = true;

	light.shadowMapWidth = 1024;
	light.shadowMapHeight = 1024;

	light.shadowCameraLeft = -d;
	light.shadowCameraRight = d;
	light.shadowCameraTop = d;
	light.shadowCameraBottom = -d;

	light.shadowCameraFar = 3 * d;
	light.shadowCameraNear = d;
	light.shadowDarkness = 0.5;

	return light;
}

function setScene(scene_name) {
	for (var m in meshes) {
		scene.remove(meshes[m]);
	}

	for (var w in bodyWires) {
		scene.remove(bodyWires[w]);
	}

	for (var b in bodies) {
		world.remove(bodies[b]);
	}

	for (var mn in meshNormals) {
		scene.remove(meshNormals[mn]);
	}

	meshes = [];
	bodies = [];
	bodyWires = [];
	meshNormals = [];

	switch(scene_name) {
		case "Cubes":
			// cubes
			var cubeGeo;
			var cubeMaterial = new THREE.MeshLambertMaterial({
				color : 0x3333ff
			});
			var mass = 5;

			for (var i = 0; i < n_cubes; i++) {
				cubeGeo = new THREE.BoxGeometry(1, 1, 1);

				cubeMesh = new THREE.Mesh(cubeGeo, cubeMaterial);
				cubeMesh.castShadow = true;

				meshes.push(cubeMesh);

				// meshes.push(cubeMesh);
				cubeMesh.name = "cube " + i;

				scene.add(cubeMesh);

				var edges = new THREE.EdgesHelper(cubeMesh, 0x0000ff);
				edges.material.linewidth = 2;

				scene.add(edges);

				// facesMeshHelper = new THREE.FaceNormalsHelper( cubeMesh, 0.3 );
				// meshNormals.push(facesMeshHelper)
				// scene.add(facesMeshHelper);

				// boxes

				boxBody = new CANNON.Body({
					mass : mass
				});

				boxBody.addShape(getBodyFromGeometry(cubeMesh.geometry));
				boxBody.position.y = (i + 1) * 1.25;
				boxBody.position.z = 0;

				boxBody.name = "Box Body " + i;
				world.add(boxBody);
				bodies.push(boxBody);

				bodyWires.push(getMeshFromBody(boxBody));

			}

			break;
		case "Pillars":
			loader.load("rsc/scenes/pillars/pillar.js", function (geometry) {

				var material = new THREE.MeshPhongMaterial({
					color : 0x3333ff
				});
				var mass = 5;

				for (var i = 0; i < 3; i++) {

					var mesh = new THREE.Mesh(geometry, material);
					mesh.castShadow = true;
					meshes.push(mesh);
					mesh.name = "pillar  " + i;
					scene.add(mesh);

					// facesMeshHelper = new THREE.FaceNormalsHelper( mesh, 0.3 );
					// meshNormals.push(facesMeshHelper)
					// scene.add(facesMeshHelper);

					// boxes
					var body = new CANNON.Body({
						mass : mass
					});

					// Add to compound
					body.addShape(getBodyFromGeometry(geometry));

					body.position.z = i * 2 - 2;
					body.position.y = (n_cubes - i + 3) * .25;

					body.name = "Box Body " + i;
					world.add(body);
					bodies.push(body);
					bodyWires.push(getMeshFromBody(body));
				}

			});
			break;
		case "Spheres":
			loader.load("rsc/models/ball.js", function (geometry) {

				var material = new THREE.MeshPhongMaterial({
					color : 0x3333ff
				});
				var mass = 5;

				for (var i = 0; i < 4; i++) {

					var mesh = new THREE.Mesh(geometry, material);
					mesh.castShadow = true;
					meshes.push(mesh);
					mesh.name = "pillar  " + i;
					scene.add(mesh);

					// facesMeshHelper = new THREE.FaceNormalsHelper( mesh, 0.3 );
					// meshNormals.push(facesMeshHelper)
					// scene.add(facesMeshHelper);

					// boxes
					var body = new CANNON.Body({
						mass : mass
					});

					// Add to compound
					body.addShape(getBodyFromGeometry(geometry));

					body.position.y = 2;
					body.position.z = (i + -2) * 2;

					body.name = "Box Body " + i;
					world.add(body);
					bodies.push(body);
					bodyWires.push(getMeshFromBody(body));
				}

			});
			break;

		case "Torus":
			var mass = 5;

			var body = new CANNON.Body({
				mass : mass
			});

			var material = new THREE.MeshPhongMaterial({
				color : 0x3333ff,
				shading : THREE.FlatShading
			});

			body.position.y = 3;

			body.name = "Torus Box Body";

			var segments_left = 16;

			var geometry = new THREE.Geometry();

			for (var i = 1; i <= 16; i++) {
				loader.load("rsc/scenes/torus/torus-" + i + ".js", function (new_geo) {
					THREE.GeometryUtils.merge(geometry, new_geo);

					// Add to compound
					body.addShape(getBodyFromGeometry(geometry));

					if (--segments_left == 0) {
						var mesh = new THREE.Mesh(geometry, material);
						mesh.castShadow = true;
						meshes.push(mesh);
						mesh.name = "torus  " + i;
						scene.add(mesh);

						world.add(body);
						bodies.push(body);
						bodyWires.push(getMeshFromBody(body));
					}

				});
			}

			break;

	}
}

function setFracturePattern(pattern) {

	// do nothing if no change
	if (fracturePatternName == pattern) {
		return;
	}

	if (fracturePattern) {
		scene.remove(fracturePattern);
		// scene.remove(fracturesNormalsHelper);
	}

	fracturePatternCuts = [];

	switch(pattern) {
		case "Pyramid":

			loader.load("rsc/fracture_templates/pyramid/pyramid.js", function(geometry) {
				for (var i = 0; i < geometry.vertices.length; i++) {
					geometry.vertices[i].multiplyScalar(.2);
				}

				fracturePattern = new THREE.Mesh(geometry, markerMaterial);
				fracturePattern.name = "click marker";
				scene.add(fracturePattern);

				loadCuts("pyramid", 5);
			});

			break;

		case "Tri-Split":

			loader.load("rsc/fracture_templates/trisplit/trisplit.js", function (geometry) {
				fracturePattern = new THREE.Mesh(geometry, markerMaterial);
				fracturePattern.name = "click marker";
				scene.add(fracturePattern);

				loadCuts("trisplit", 3);
			});

			break;

		case "Plane":
			loader.load("rsc/fracture_templates/plane/plane.js", function (geometry) {
				fracturePattern = new THREE.Mesh(geometry, markerMaterial);
				fracturePattern.name = "click marker";
				scene.add(fracturePattern);

				loadCuts("plane", 2);
			});

			break;

	}

	fracturePatternName = pattern;
}

function loadCuts(dirname, numCuts) {
	for (var i = 1; i <= numCuts; i++) {
		loader.load("rsc/fracture_templates/" + dirname + "/" + dirname + "-" + i + ".js", function (geometry) {
			fracturePatternCuts.push(geometry);
		});
	}
}