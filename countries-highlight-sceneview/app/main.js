require([
  "esri/WebScene",
  "esri/views/SceneView",
  "esri/layers/FeatureLayer",
  "esri/Graphic",
  "esri/symbols/SimpleMarkerSymbol", 
  "esri/symbols/PointSymbol3D", 
  "esri/layers/GraphicsLayer",
  "esri/layers/support/Field", 
  "esri/layers/support/LabelClass",
  "esri/symbols/LabelSymbol3D", 
  "esri/widgets/Popup", 
  "esri/PopupTemplate",
  "dojo/dom",
  "dojo/text!./app/config.json", 
  "dojo/domReady!"
], function (
    WebScene, 
    SceneView, 
    FeatureLayer, 
    Graphic, 
    SimpleMarkerSymbol, 
    PointSymbol3D,
    GraphicsLayer, 
    Field, 
    LabelClass, 
    LabelSymbol3D,
    Popup, 
    PopupTemplate, 
    dom, 
    configText) {

      //===Config: 
      var config = JSON.parse(configText); 
      console.log(config); 

      //===Web Scene: the web scene is the data model: it contains the basemap, the ground and the layers
      const webscene = new WebScene({
        basemap: null,
        ground: {
            surfaceColor: config.surfaceColor
        }
      });
      //===Base countries Feature Layer: 
      const baseCountries = new FeatureLayer({
          url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World__Countries_Generalized_analysis_trim/FeatureServer/0",
          title: "World Countries Base", 
          renderer: {
              type: "simple", 
              symbol: {
                  type: "polygon-3d", 
                  symbolLayers: [{
                      type: "fill", 
                      material: { color: config.baseCountriesColor }, 
                      outline: {
                          color: config.fillOutline,
                          opacity: config.fillOutlineOpacity
                      }
                  }]
              }
          }
        })
      
      //===Countries Feature Layer: 
      const countries = new FeatureLayer({
          url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World__Countries_Generalized_analysis_trim/FeatureServer/0",
          title: "World Countries",
          definitionExpression: "NAME in " + config.countriesArray,
          popupTemplate: {
              title: config.popupTitle,
              content: config.popupContent
          },
          renderer: {
              type: "simple",
              symbol: {
                  type:"polygon-3d",
                  symbolLayers: [{
                      type:"fill",
                      material: { color: config.fillColor},
                      outline: {
                          color: config.fillOutline, 
                          opacity: config.fillOutlineOpacity
                      }
                  }]
              }
          }
      });
      
      //===== Getting centroids of country polygons to plot points 
      //console.log("In:QuerySection"); 
      window.countries = countries; 

      //===Query for centroids, NAME, and OBJECTID: 
      var query = countries.createQuery();
      query.outFields.push("OBJECTID");
      countries.queryFeatures(query).then(function(features) {
         // console.log("In:Queryfunction");
          window.features = features; 

          countryPoints = features.features.map(function(feature) {
              var centroid = feature.geometry.centroid; 
              var NAME = feature.attributes.NAME; 
              var id = feature.attributes.OBJECTID; 
              return {centroid, NAME, id}; 
          }); 
         // Make Graphics / FeatureLayer
          makePoints(countryPoints); 
      })

      //===makePoints function will make graphics of country centroids
      function makePoints(countryPoints) {
          // console.log("In:makePoints()")
          // First: Create an array of graphics with geometry and attributes 
          graphics = countryPoints.map(function(point) {
              var graphic = new Graphic({
                  geometry: point.centroid, 
                  attributes: {
                    name: point.NAME, 
                    objectId: point.id
                  },
                  symbol: {
                      type: "point-3d", 
                      symbolLayers: [{
                          type: "icon", 
                          size: 8, 
                          resource: {primitive: "circle"}, 
                          material: { color: config.symbolFill}, 
                          outline: {
                              size: 1, 
                              color: config.symbolOutline
                          }
                      }], 
                      verticalOffset: {
                          screenLength: 25
                      }, 
                      callout: {
                          type: "line", 
                          size: 1.5, 
                          color: config.symbolFill
                      }
                  }
              })
              return graphic; 
          })

          //===Make a Feature Layer of the centroid points 
          const fields = [
            {
              name: "name", 
              alias: "Country name", 
              type: "string", 
            }, {
              name: "objectId", 
              alias: "ObjectID",
              type: "oid"
            }
          ]; 
          
          const pointsFeatLayer = new FeatureLayer({
            source: graphics,
            geometryType: "point", 
            spatialReference: {wkid: 4326}, 
            objectIdField: "objectId", 
            fields: fields
          })

          //===Set labels 
          pointsFeatLayer.labelsVisible = true; 
          pointsFeatLayer.labelingInfo = [
            new LabelClass({
              labelExpressionInfo: { expression: "$feature.name" },
              symbol: {
                type: "label-3d",
                symbolLayers: [{
                  type: "text",
                  material: { color: config.symbolFill },
                  size: 10,
                  font: {
                    family: config.labelFontFamily,
                    weight: config.labelFontWeight 
                  },
                  halo: {
                    color: config.symbolOutline,
                    size: .5
                  }
                }]
              }
            })
          ]; 
          webscene.add(pointsFeatLayer); 
      }

      //===Add Graticule: 
      const graticule = new FeatureLayer({
          url: "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/World_graticule_15deg/FeatureServer",
          opacity: .7
      });

      //===Add graticule and country layers to scene: 
      webscene.addMany([baseCountries, graticule, countries]); 

      //===View: the view is the visual representation of the web scene
      //This view is set to have a transparent background, to allow for personalization 
      const view = new SceneView({
        container: "view",
        map: webscene, 
        scale: 100000000,
        alphaCompositingEnabled: true, 
        environment: {
            background: {
                type: "color", 
                color: [0, 0, 0, 0]
            }, 
            starsEnabled: false,
            atmosphereEnabled: false, 
        }, 
        highlightOptions: {
          color: config.highlightColor,
          fillOpacity: .5
        }
      });

      // setting the view as a global object is useful for debugging
      window.view = view;
      view.popup.alignment = config.popupAlignment; 

      //===Spin: 
      //Try 1: 
    //   var lat = -126; 
    //   var long = 49; 
    //   var goTo = {
    //       center: [-126, 49],
    //       heading: 270
    //   };
    //   var how = {
    //       easing: "linear",
    //       speedFactor: .01
    //   };
    //   function spin() {
    //     return view.goTo(goTo, how); 
    //   }
    
      
    //   spin = function()  {
    //       console.log("In:spin()"); 
    //       timerWorker = new Worker('./app/timer-worker.js'); 

    //       message = event.srcElement.id; 
    //       console.log(message); 
    //       console.log(typeof message); 

    //       if (message == "start") {
    //           timerWorker.postMessage([message, timerIntervalMS]); 
    //       }
    //       if (message == "stop" ) {
    //           timerWorker.postMessage([message])
    //       }

    //       timerWorker.onmessage = function(msg) {
    //             console.log("timer tick ", msg); 
    //             if(countries.loaded){
    //             window.requestAnimationFrame(moveView); 
    //         }
    //       }, function(err){
    //             console.error("Problem loading view", err); 
    //       }
    //       timerWorker.close(); 
    //       timerWorker = null; 

    //     //   

    //     //   timerWorker.postMessage([code, timerIntervalMS]);

    //     //   timerWorker.onmessage = function(msg) {
    //     //       console.log("timer tick ", msg); 
    //     //       if(countries.loaded){
    //     //           window.requestAnimationFrame(moveView); 
    //     //       }
    //     //   }, function(err){
    //     //       console.error("Problem loading view", err); 
    //     //   }
    //   }

    //   function moveView() {
    //     const center = view.center.clone();
    //     center.x += centerIncrement; 
    //     view.center = center; 
    //     console.log("moving"); 
    // }
      
    const timerIntervalMS = 15; //millis 
    const centerIncrement = 10000; 
    let timerWorker = new Worker('./app/timer-worker.js'); 

      view.when(function() {
          console.log("here"); 
          // Get buttons: 
          let stopBtn = document.getElementById('pause'); 
          let startBtn = document.getElementById('play');
          // Click functions: 
          stopBtn.addEventListener('click', function() {
            console.log("stopBtn:did click"); 
              stopBtn.classList.toggle('hidden'); 
              startBtn.classList.toggle('hidden'); 
              timerWorker.postMessage(['stop']);
          }); 

          
          startBtn.addEventListener('click',function(){
              console.log("startBtn:did click"); 
              startBtn.classList.toggle('hidden'); 
              stopBtn.classList.toggle('hidden'); 
              timerWorker.postMessage(['start', timerIntervalMS]); 
          }); 

          timerWorker.onmessage = function(msg) {
              console.log("timer tick ", msg); 
              if(countries.loaded){
                  window.requestAnimationFrame(moveView); 
              }
          }, function(err){
              console.error("Problem loading view", err); 
          }
      }); 
      
      function moveView() {
          const center = view.center.clone();
          center.x += centerIncrement; 
          view.center = center; 
          console.log("moving"); 
      }
  });    
