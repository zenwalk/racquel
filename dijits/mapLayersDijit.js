dojo.provide("racquelDijits.mapLayersDijit");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("esri.dijit.Legend");
dojo.declare("racquelDijits.mapLayersDijit",[dijit._Widget,dijit._Templated],{
	widgetsInTemplate:true,
	templatePath: dojo.moduleUrl("racquelDijits","templates/mapLayersDijit.html"),
	constructor:function(params){
		params = params || {};
		if (!params.map){
			this.mapConnected = false;
		}
		else {
			this.map = params.map;
		}
		// object where keys are integers whose order gives order of adding to map, and value is a 
		// pair of tiled map service URL/boolean visibility. See default ones below. 
		// To be added to map in order with first at the bottom etc
		this.baseLayerUrls = params.baseLayers || [];
		this.baseLayerObjects = [];
		// object where keys are integers, whose order gives order of adding to map, and value is a pair 
		// of dynamic map service URL / array of visible sublayers
		this.dynamicLayerUrls = params.dynamicLayers || [];
		this.dynamicLayerObjects = [];
	},
	_buildLayers:function(){
		dojo.forEach(this.baseLayerUrls,dojo.hitch(this,function(baselayerconfig){
			 var tiledLayer = new esri.layers.ArcGISTiledMapServiceLayer(baselayerconfig.url);
			 tiledLayer.visible = baselayerconfig.visible;
			 var layerpair = {};
			 layerpair[baselayerconfig.name] = tiledLayer;
			 this.baseLayerObjects.push(layerpair);
		}));
		dojo.forEach(this.dynamicLayerUrls,dojo.hitch(this,function(dynlayerconfig){
			var dynLayer = new esri.layers.ArcGISDynamicMapServiceLayer(dynlayerconfig.url);
			dynLayer.setVisibleLayers(dynlayerconfig.visible);
			dynLayer.setOpacity(0.7);
			var layerpair = {};
			layerpair[dynlayerconfig.name] = dynLayer;
			this.dynamicLayerObjects.push(layerpair);
		}));
	},
	_addLayersToMap:function(){
		dojo.forEach(this.baseLayerObjects,dojo.hitch(this,function(baseLayerPair){
			// baseLayerPair is Displayname:layerobject pair
			// there's only one but we don't know the key
			for(var v in baseLayerPair){
				if (baseLayerPair.hasOwnProperty(v)){
					this.map.addLayer(baseLayerPair[v]);
				}
			}
		}));
		
		var dynServNum = 1;
		var dynLayers = [];
		
		dojo.forEach(this.dynamicLayerObjects,dojo.hitch(this,function(dynamicLayerPair){
			for (var v in dynamicLayerPair){
				if(dynamicLayerPair.hasOwnProperty(v)){
					dynLayers.push(dynamicLayerPair[v]);
				}
			}
		}));
		dojo.connect(this.map,'onLayersAddResult',dojo.hitch(this,function(res){
			if (!this.legend) {
				this.buildLegend();
			}
		}));
		this.map.addLayers(dynLayers);
	},
	startup:function(){
		// create the actual layers
		this._buildLayers();
		// add them to the map
		this._addLayersToMap();
		// build the checkbox controls
		this._buildBaseLayerList();
		this._buildDynamicLayerListWhenLoaded();
	},
	_buildBaseLayerList:function(){
		dojo.forEach(this.baseLayerObjects,dojo.hitch(this,function(baseLayerPair){
			// for tiled map services we show a single checkbox with the name of the service
			var label = "";
			for (var l in baseLayerPair){
				if (baseLayerPair.hasOwnProperty(l)){
					label = l;
				}
			}
			var layer = baseLayerPair[label];
			var cb = new dijit.form.CheckBox({
				checked: layer.visible,
				onChange:dojo.hitch(this,function(){this._updateBaseVisibility(label,cb.checked)}),
				value: "tiledCB"
			}, "checkBox"); 
			var d = dojo.create("div",{
				innerHTML:label
			});
			cb.set("class","tiled_map_layer_box");
			d.className = "tiled_map_layer_item";
			cb.startup();
			dojo.place(cb.domNode,d,"first");
			dojo.place(d,this.baseList,"first");
			//this.baseList.appendChild(d);
		}));
	},
	_buildDynamicLayerListWhenLoaded:function(){
		dojo.forEach(this.dynamicLayerObjects,dojo.hitch(this,function(dynLayerPair){
			// each loop is a dynamic map service, that may contain many layers. It's those sublayers we
			// want to have checkboxes for, not the overall service.
			var label = "";
			for (var l in dynLayerPair){
				if (dynLayerPair.hasOwnProperty(l)){
					label = l;
				}
			}
			var layer = dynLayerPair[label];
			if (layer.loaded){
				this._buildDynamicLayerList(dynLayerPair);
			}
			else {
				dojo.connect(layer,"onLoad",dojo.hitch(this,function(){
					this._buildDynamicLayerList(dynLayerPair);
				}));
			}
		}));
	},
	_buildDynamicLayerList:function(dynLayerPair){
		// this function builds the checkboxes for the dynamic map service sublayers
		var servicename = "";
		for (var l in dynLayerPair){
				if (dynLayerPair.hasOwnProperty(l)){
					servicename = l;
				}
		}
		var layer = dynLayerPair[servicename];
		var infos = layer.layerInfos, info;
		var items = [];
		// all layers in the service will go into one div that will be outlined / rounded
		var mapServiceDiv = dojo.create("div",{innerHTML:servicename});
		mapServiceDiv.className = "dynamic_map_service_item layers_rounded_corners";
		var currentVisible = layer.visibleLayers;
		dojo.forEach(infos,dojo.hitch(this,function(layerinfo){
			// each loop is a layer within the map service
			//var info = infos[i];	
			// only add a checkbox for top level layers (i.e. not layers within group layers) 
			if(layerinfo.parentLayerId==-1){
				var setChecked = dojo.indexOf(currentVisible,layerinfo.id)!=-1;
				var cb = new dijit.form.CheckBox({
				checked:setChecked,
				onChange:dojo.hitch(this,function(){this._updateDynamicVisibility(dynLayerPair,layerinfo.id,cb.checked)}),
				value:"dynamicCB"
			},
			"checkBox");
			var d = dojo.create("div",{
				innerHTML:layerinfo.name
			});
			cb.set("class","dynamic_map_layer_box");
			d.className = "dynamic_map_layer_item";
			cb.startup();
			dojo.place(cb.domNode,d,"first");
			mapServiceDiv.appendChild(d);
			}
		}));
		this.layersList.appendChild(mapServiceDiv);
		
	},
	buildLegend:function(){
		if(!this.map){return;}
		var legLayers = dojo.map(this.dynamicLayerObjects,dojo.hitch(this,function(pair){
			for (dynServiceName in pair){
				// don't want to display a title for the overall dynamic service, use a single space string
				if (pair.hasOwnProperty(dynServiceName)){
					return {layer:pair[dynServiceName],title:' '};
				}
			}
		}));
		this.legend = new esri.dijit.Legend({
			map:this.map,
			respectCurrentMapScale:true,
			layerInfos:legLayers
		},this.legendArea);
		this.legend.startup();
	},
	_updateBaseVisibility:function(label,setOn){
		dojo.some(this.baseLayerObjects,dojo.hitch(this,function(baseLayerPair){
			if(baseLayerPair.hasOwnProperty(label)){
				baseLayerPair[label].setVisibility(setOn);
				return true;
			}
		}));
	},
	_updateDynamicVisibility:function(dynLayerPair,sublayernum,setOn){
		// unlike in previous NRFA maps we're not using dom functions to go over the checkboxes. 
		// instead this function is called within a closure so we have a direct reference to the details
		// we want to change
		var servicename = "";
		for (var l in dynLayerPair){
				if (dynLayerPair.hasOwnProperty(l)){
					servicename = l;
				}
		}
		var layer = dynLayerPair[servicename];
		// operating directly on the layer.visibleLayers might be dodgy as you're supposed to use 
		// setVisibleLayers method. Remember pass-by-ref means we need to clone it rather than just use it
		var newVisible = dojo.clone(layer.visibleLayers);
		if (setOn){
			// turn it on, if not already
			if (dojo.indexOf(newVisible,sublayernum)==-1){
				newVisible.push(sublayernum);
				var finalVisible = dojo.filter(newVisible,dojo.hitch(this,function(item){
					return item != -1;
				}));
				layer.setVisibleLayers(finalVisible);
			}
		}
		else {
			// turn it off, if not already
			if (dojo.indexOf(newVisible,sublayernum)!=-1){
				// it's in the 
				var finalVisible = dojo.filter(newVisible,dojo.hitch(this,function(item){
					return item != sublayernum;
				}));
				if (finalVisible.length == 0){
					finalVisible.push(-1);
				}
				layer.setVisibleLayers(finalVisible);
			}
		}
		this.legend.refresh();
	}
});
