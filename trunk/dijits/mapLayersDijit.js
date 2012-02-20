dojo.provide("racquelDijits.mapLayersDijit");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
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
		this.baseLayerUrls = params.baseLayerUrls || [];
		this.baseLayers = [];
		// object where keys are integers, whose order gives order of adding to map, and value is a pair 
		// of dynamic map service URL / array of visible sublayers
		this.dynamicLayerUrls = params.dynamicLayerUrls || [];
		this.dynamicLayers = [];
		var serverBase = "http://wlwater.ceh.ac.uk/ArcGIS/rest/services/";
		// if none specified then use default. Specify in order they need to be added to map (lowest first)
		if (this.baseLayerUrls.length ===0){
			this.baseLayerUrls.push( 
				{url:		serverBase+"TileMapLayers/UK_Coastline_Vignetted/MapServer",
				 name: 		"Coastline",
				 visible:	true});
			this.baseLayerUrls.push( 
				{url:		serverBase+"OSOpendata/OS_Opendata_Backdrop/MapServer",
				 name:		"OS Maps", 
				visible:	false});
			this.baseLayerUrls.push( 
				{url:		serverBase+"TileMapLayers/UK_Rivers_Cached/MapServer",
				 name:		"Rivers",
				 visible: true});
		}
		if (this.dynamicLayerUrls.length === 0){
			this.dynamicLayerUrls.push( 
				{url:		serverBase+"NRFA_GIS/NRFA_Website_TempService/MapServer",
				name: 		"Standard NRFA layers",
				visible:	[-1]});
		}
	},
	_buildLayers:function(){
		dojo.forEach(this.baseLayerUrls,dojo.hitch(this,function(baselayerconfig){
			 var tiledLayer = new esri.layers.ArcGISTiledMapServiceLayer(baselayerconfig.url);
			 tiledLayer.visible = baselayerconfig.visible;
			 var layerpair = {};
			 layerpair[baselayerconfig.name] = tiledLayer;
			 this.baseLayers.push(layerpair);
		}));
		dojo.forEach(this.dynamicLayerUrls,dojo.hitch(this,function(dynlayerconfig){
			var dynLayer = new esri.layers.ArcGISDynamicMapServiceLayer(dynlayerconfig.url);
			dynLayer.setVisibleLayers(dynlayerconfig.visible);
			dynLayer.setOpacity(0.7);
			var layerpair = {};
			layerpair[dynlayerconfig.name] = dynLayer;
			this.dynamicLayers.push(layerpair);
		}));
	},
	_addLayersToMap:function(){
		dojo.forEach(this.baseLayers,dojo.hitch(this,function(baseLayerPair){
			// baseLayerPair is Displayname:layerobject pair
			// there's only one but we don't know the key
			for(var v in baseLayerPair){
				if (baseLayerPair.hasOwnProperty(v)){
					this.map.addLayer(baseLayerPair[v]);
				}
			}
		}));
		dojo.forEach(this.dynamicLayers,dojo.hitch(this,function(dynamicLayerPair){
			for (var v in dynamicLayerPair){
				if(dynamicLayerPair.hasOwnProperty(v)){
					this.map.addLayer(dynamicLayerPair[v]);		
				}
			}
		}));
		// hack to get rivers on top. should probably specify a "ontop" property or something
		dojo.some(this.baseLayers,dojo.hitch(this,function(baseLayerPair){
			if (baseLayerPair.hasOwnProperty("Rivers")) {
				this.map.reorderLayer(baseLayerPair["Rivers"], 99);
				return true;
			}
		}));
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
		dojo.forEach(this.baseLayers,dojo.hitch(this,function(baseLayerPair){
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
		dojo.forEach(this.dynamicLayers,dojo.hitch(this,function(dynLayerPair){
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
	_updateBaseVisibility:function(label,setOn){
		dojo.some(this.baseLayers,dojo.hitch(this,function(baseLayerPair){
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
	}
});
