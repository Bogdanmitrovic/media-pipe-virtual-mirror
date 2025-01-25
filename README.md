# MediaPipe & Three.js Virutal Mirror

## Files

The project consists of several important files: 
- *index.html*
- *main.js*
- *task-vision.js*

**index.html** - shows the structure of the web page, parts of it are:
    - stream shown by camera which renders mesh tracking facial features
    - facial features metrics
    - head model which mimics facial features that are read by camera

**main.js** - this file holds the entire logic behind the program. 
It detects facial movements and maps the relevant movements to the head model which will be shown on the page.  

**task-vision.js** - this file is imported from **mediapipe** library, and is used for detecting facial features.

## How to run

Run a simple http server, it can be done through Visual Studio Code. 
It will open a certain port, and you can access the page via localhost.
This program requires a camera, and will ask the user for camera access.

## How to add more action units

Action units are a part of *main.js* file. Format of each action unit is AU_*number*. They need to be read from metrics shown on a display, and in certain section should be mapped like this: 

'facial_feature' : 'AU_number'

Adding new action units would require updating the *head.gltf* file.

