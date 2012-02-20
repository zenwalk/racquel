dojo.provide("racquelDijits.racquelResultManager");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.Dialog");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojox.grid.cells.dijit");
dojo.require("dojo.data.ItemFileWriteStore");
dojo.require("dojox.layout.FloatingPane");
dojo.require("racquelDijits.racquelDataDescriptions");
dojo.declare("racquelDijits.racquelResultManager",[dijit._Widget,dijit._Templated],{
	widgetsInTemplate:true,
	constructor:function(params){
		params = params || {};
		// the widget can function without a map e.g. in the case of being used to display batch searches 
		if (!params.map){
			this.mapConnected = false;
		}
		else 
		{
			this.map = params.map;
			this._graphicsLayer = new esri.layers.GraphicsLayer();
			this.map.addLayer(this._graphicsLayer);
			this.mapConnected = false;
		}
		if((!params.displayMode )|| params.displayMode == "floating"){
			this.templateString = dojo.cache(dojo.moduleUrl("racquelDijits","templates/racquelResultManager_floating.html"));
			this.floating=true;
		}
		else{
			this.templateString = dojo.cache(dojo.moduleUrl("racquelDijits","templates/racquelResultManager_fixed.html"))
			this.floating=false;
		}
		//this._VisibleSearchList=[];
		this.toolbar = params.racquelToolbar;
	},
	startup:function(){
		this._grid.startup();
		//dojo.connect(this._grid,"onMouseOverRow",dojo.hitch(this,this._gridRowHoverHandler));
		//dojo.connect(this._grid,"onMouseOutRow",dojo.hitch(this,this._gridRowHoverOutHandler));
		dojo.connect(this._btnSelectAll,"onClick",dojo.hitch(this,this._selectAll));
		dojo.connect(this._btnSelectNone,"onClick",dojo.hitch(this,this._selectNone));
		dojo.connect(this._btnDeleteSelected,"onClick",dojo.hitch(this,this._deleteSelected));
		dojo.connect(this._btnZoomSelected,"onClick",dojo.hitch(this,this._zoomSelected));
		dojo.connect(this._btnSaveSelected,"onClick",dojo.hitch(this,this._saveSelected));
		dojo.connect(this._btnExportSelected,"onClick",dojo.hitch(this,this._exportSelected));
		if(this.floating){
			this.floatingWindow.startup();
			// the floating pane sets its natural state from its domNode at startup. But it doesn't seem
			// to work right with the natural width and height being set to 0. This causes the children
			// to be resized to zero if the pane's resize is called. Bodge to override it by getting the actual 
			// sizes (assuming it's visible!)
			//this.fwSize = this._getSize(this.floatingWindow.domNode);
			this.fwSize = dojo.coords(this.floatingWindow.domNode);
			this.floatingWindow._naturalState = this.fwSize;
		}
		// listen out for a search result being stored (by search dijit, into toolbar's resultstore). 
		// When there is one, retrieve it and show it
		dojo.subscribe("racquelResultStored",dojo.hitch(this,function(searchId){
			this._addResultToGrid(searchId);
		}));
		// listen out for the toolbar's resultstore being cleared. Clear this to match. 
		dojo.subscribe("racquelResultsCleared",dojo.hitch(this,function(){
			this._clearAllResults();
		}));
		// listen out for a result being removed from the toolbar's resultstore. Find it and remove it here.
		dojo.subscribe("racquelResultCleared",dojo.hitch(this,function(searchId){
			this._removeResultFromGrid(searchId);
		}));
		// Set up the grid's datastore. 
		var data = {
			identifier:"SearchId",
			label:"RIVER",
			items:[]
		};
		this.store = new dojo.data.ItemFileWriteStore({data:data});
		this._grid.setStore(this.store);
		this._grid.setQuery({});
		// load the grid with anything that's already in the resultStore at startup (persisted from earlier session)
		var existingSearches = this.toolbar.racquelResultStore.getSearchIds();
		dojo.forEach(existingSearches, dojo.hitch(this,function(searchIdx){
			this._addResultToGrid(searchIdx);
		}));
	},
	postCreate:function(){
		// ensure that the grid's formatter functions (to make checkboxes etc) execute in the scope of this
		// widget
		this._grid.attr("formatterScope",this);
	},
	_addResultToGrid:function(searchId){
		// A result has been stored in the toolbar. This method 
		// will be called with a searchId. Retrieve the corresponding object and format it for the grid
		var racquelResultItem = this.toolbar.racquelResultStore.getWholeResult(searchId);
		var siteExists=null,routeExists=null,catchExists=null;
		if (racquelResultItem.hasOwnProperty('siteResult')){
			siteExists = racquelResultItem.siteResult.successful;
		}
		if (racquelResultItem.hasOwnProperty('routeResult')){
			routeExists = racquelResultItem.routeResult.successful;
		}
		if (racquelResultItem.hasOwnProperty('catchResults')){
			catchExists = racquelResultItem.catchResults.successful;
		};
		var riverName = "N/A"
		var searchLocation = racquelResultItem.searchLocation;
		if (routeExists) {
			riverName = racquelResultItem.routeResult.riverSegment.attributes["OS_NAME"];
		}
		// ..Exists variables are null for not done, true for successful, false for error
		var newjson = {
			River: 		riverName,
			SearchId:	searchId,
			Location:		searchLocation, // will be displayed via formatter function
			Site:		siteExists,
			Route:		routeExists,
			Catchment:	catchExists,
			Show:		false
		}
		console.log("adding item to grid "+newjson);
		this.store.newItem(newjson);
		//this._grid.render();
		this.store.save();
	},
	_clearAllResults:function(){
		// delete all rows from the grid and all graphics from the map
		if (this._graphicsLayer){
			this._graphicsLayer.clear();
		}
		var data = {
			identifier:"SearchId",
			label:"RIVER",
			items:[]
		};
		this.store = new dojo.data.ItemFileWriteStore({data:data});
		this._grid.setStore(this.store);
		this._grid.setQuery({});
	},
	_removeResultFromGrid:function(searchId){
		// remove the row corresponding to searchId from the grid, and associated graphics from the map
		// DO NOT call directly in this widget. This widget's delete controls act on the toolbar's result store
		// and this method will then be called in response to the change there.
		/*if (this._graphicsLayer) {
			dojo.forEach(this._graphicsLayer.graphics,dojo.hitch(this,function(graphic){
				if((graphic.attributes) && graphic.attributes[searchId]==searchId){
					this._graphicsLayer.remove(graphic);
				}
			}));
		}*/
		this._showHideResults(searchId,true);//remove from map, if showing
		this.store.fetch({query:{'SearchId':searchId},onComplete:dojo.hitch(this,function(items){
			var item = items[0];
			this.store.deleteItem(item);
			this.store.save();
		})});
	},
	_getGridCheckBox:function(storeitemfield){
		// formatter function to create checkbox to select a grid row for deletion (future: export), etc
		// NOT USED
		var cb = new dijit.form.CheckBox({
			name:"checkBox",
			value:"blah",
			cbid:storeitemfield,
			checked:false,
			title:"Mark for export",
			className:"racquelIdCheckBox"
		},"checkBox");
		return cb;
	},
	_getGridCoords:function(storeitemfield){
		// formatter function to extract and concatenate into a single string the search coordinates
		// this function receives only one field from the store item (field is named in template)
		var x = Math.round(storeitemfield.geometry.x);
		var y = Math.round(storeitemfield.geometry.y);
		return x+","+y;
	},
	_getGridYesNoText:function(storeitemfield){
		// formatter function to write Yes or No instead of true/false in the site/route/catchment columns
		if (storeitemfield !== null) {
			if (storeitemfield == true) {
				return "Yes";
			}
			else {
				return "Error!";
			}
		}
		else {
			return "No";
		}
	},
	_getGridShowHideBox:function(storeitem){
		// formatter function to create checkbox to add / remove a search result from the map
		// this function receives the whole store item (field is defined in template as _item), 
		// not just a field.
		if (storeitem.Route[0] || storeitem.Catchment[0]){
		var cb = new dijit.form.CheckBox({
			name:"checkBox",
			value:"blah",
			checked: storeitem.Show[0], // will always not be shown initially
			onChange: dojo.hitch(this,function(){
				this._showHideResults(storeitem.SearchId[0]);
			}),
			title: "Show / hide these results on the map"
		}, "checkBox");
		return cb;
		}
		else{
			return "<span title='No graphical results (route or catchment) retrieved'>N/A</span>";
		}
	},
	_getShowDetailsButton:function(searchId){
		// formatter function to make button to show details of search
		var button = new dijit.form.Button({
			label:"Show!",
			onClick:dojo.hitch(this,function(){
				this._showSearchDetails(searchId);
			})
		});
		button.startup();
		return button;
	},
	_getZoomToButton:function(searchId){
		var button = new dijit.form.Button({
			label:"Zoom",
			onClick:dojo.hitch(this,function(){
				this._zoomSelected([searchId]);
			})
		});
		button.startup();
		return button;
	},
	_showHideResults:function(searchId,onlyHide){
		// handle change of a checkbox to add or remove associated search graphics on the map 
		var showing = false;
		dojo.some(this._graphicsLayer.graphics,dojo.hitch(this,function(graphic){
			if ((graphic.attributes) && graphic.attributes.searchId == searchId)
			{
				showing = true; 
				return true;
			} 
		}));
		// onlyHide enables this function to be called to remove a graphic only, not add it
		// This is used when a result is deleted - we want to remove it from the map if present, or take no action if not
		if (!showing && !onlyHide) {
			// Graphics are not showing, and we do want to add them
			var racquelResultItem = this.toolbar.racquelResultStore.getWholeResult(searchId);
			//var siteExists = racquelResultItem.hasOwnProperty('siteResult');
			//var routeExists = racquelResultItem.hasOwnProperty('routeResult');
			this._graphicsLayer.add(racquelResultItem.searchLocation.setAttributes({"searchId":searchId}).
									setSymbol(this.toolbar.racquelMapSymbols.searchPointSymbol));					
			if (racquelResultItem.hasOwnProperty('catchResults') && racquelResultItem['catchResults'].successful == true)
			{
				var catchGraphic = racquelResultItem['catchResults'].catchment;
				catchGraphic.setSymbol(this.toolbar.racquelMapSymbols.catchmentSymbol);
				this._graphicsLayer.add(catchGraphic);
			}
			if (racquelResultItem.hasOwnProperty('routeResult') && racquelResultItem['routeResult'].successful == true)
			{
				var item = racquelResultItem['routeResult'];
				this._graphicsLayer.add(item.sourceRoute.setAttributes({"searchId":searchId}).
										setSymbol(this.toolbar.racquelMapSymbols.sourceRouteSymbol));
				this._graphicsLayer.add(item.mouthRoute.setAttributes({"searchId":searchId}).
										setSymbol(this.toolbar.racquelMapSymbols.mouthRouteSymbol));
				this._graphicsLayer.add(item.source.setAttributes({"searchId":searchId}).
										setSymbol(this.toolbar.racquelMapSymbols.sourceSymbol));
				this._graphicsLayer.add(item.mouth.setAttributes({"searchId":searchId}).
										setSymbol(this.toolbar.racquelMapSymbols.mouthSymbol));
				this._graphicsLayer.add(item.riverSegment.setAttributes({"searchId":searchId}).
										setSymbol(this.toolbar.racquelMapSymbols.riversSymbol));
				this._graphicsLayer.add(item.netLocation.setAttributes({"searchId":searchId}).
										setSymbol(this.toolbar.racquelMapSymbols.locatedPointSymbol));					
			}
		}
		else
		{
			// either onlyHide was true, or the graphics are already showing, or both
			// either way we want to remove the graphics from the map. If they aren't there, then nothing will
			// happen.
			// can't use forEach to iterat over the whole graphics set and remove in situ as the indexes change
			// when one is removed so it breaks.
			var graphicsToRemove = dojo.filter(this._graphicsLayer.graphics,dojo.hitch(this,function(graphic){
				return graphic.attributes['searchId']==searchId;
			}));
			dojo.forEach(graphicsToRemove,dojo.hitch(this,function(graphic){
					this._graphicsLayer.remove(graphic);
			}));
		}
	},
	_showSearchDetails:function(searchId){
		var racquelResultItem = this.toolbar.racquelResultStore.getWholeResult(searchId);
		var siteExists=null,routeExists=null,catchExists=null;
		if (racquelResultItem.hasOwnProperty('siteResult')){
			siteExists = racquelResultItem.siteResult.successful;
		}
		if (racquelResultItem.hasOwnProperty('routeResult')){
			routeExists = racquelResultItem.routeResult.successful;
		}
		if (racquelResultItem.hasOwnProperty('catchResults')){
			catchExists = racquelResultItem.catchResults.successful;
		};
		// now the ..exists are true / false for success, or null if not done
		var riverName = "N/A"
		var searchLocation = racquelResultItem.searchLocation;
		if (routeExists) {
			riverName = racquelResultItem.routeResult.riverSegment.attributes["OS_NAME"];
		}
		var summaryTxt;
		if (riverName=="N/A") {
			summaryTxt = "Results of search at "
		}
		else {
			summaryTxt = "Results of search on "+riverName+" at "
		}
		summaryTxt = summaryTxt + this._getGridCoords(searchLocation);
		var resultPane = new dijit.layout.ContentPane({
			title:				riverName,
			doLayout:			true,
			className: "racquelResultPane",
			id:					"racquelResultPane"+searchId 
		});
		var summaryDiv = dojo.create('div',{innerHTML:summaryTxt},resultPane.domNode);		
		if (routeExists !== null){
			resultPane.domNode.appendChild(this._formatReachResult(racquelResultItem['routeResult']['riverSegment']));
		}
		if (siteExists !== null) {
			resultPane.domNode.appendChild(this._formatSiteResult(racquelResultItem['siteResult']));
		}
		if (routeExists !== null) {
			resultPane.domNode.appendChild(this._formatRouteResult(racquelResultItem['routeResult']));
		}
		if (catchExists !== null) {
			//if (routeExists !== null) {
				//resultPane.domNode.appendChild(this._formatCatchResult(racquelResultItem['catchResults'],
					//racquelResultItem['routeResult']['source']));
			//}
			//else {
				resultPane.domNode.appendChild(this._formatCatchResult(racquelResultItem['catchResults']));
			//}
		}
		resultPane.startup();
		var dialog = new dijit.Dialog({
			title: "Result details",
			content: resultPane,
			refreshOnShow:true,
			onCancel:function(){
				this.destroyRecursive();
			},
			className: "racquelResultPane",
			autofocus: !dojo.isIE,
			refocus: !dojo.isIE
		});
		dialog.startup();
		dialog.show();
	},
	_formatReachResult:function(riverReachGraphic){
		var contents = "Selected river reach:<br/>";
		if (riverReachGraphic.attributes.hasOwnProperty('STRAHLER')){
			contents += "Strahler stream order:  " + riverReachGraphic.attributes['STRAHLER'] +"<br/>";
		}
		if (riverReachGraphic.attributes.hasOwnProperty('SHREVE')){
			contents += "Shreve stream order:  " + riverReachGraphic.attributes['SHREVE']+"<br/>";
		}
		if (riverReachGraphic.attributes.hasOwnProperty('WORK_')){
			contents += "Capital works:  " + riverReachGraphic.attributes['WORK_'];
			if (riverReachGraphic.attributes['WORK_']==="Capital"){
				contents += " (" + riverReachGraphic.attributes['WORKTYPE']+")";
			}	
		}
		var div = dojo.create("div",{innerHTML:contents});
		return div;
	},
	_formatSiteResult:function(siteResultItem){
		var contents = "<H3>At-site results</H3>";
		if (!siteResultItem.successful){
			contents += "At site searches were not successful!"
		}
		else {
			contents += "<table border ='1'><tr><th>Layer</th><th>Site value</th></tr>";
            for (var i in siteResultItem.results)
			{
				if (siteResultItem.results.hasOwnProperty(i)){
					contents += "<tr><td>" + i + "</td><td>" + siteResultItem.results[i] + "</td></tr>";
				}
			}
			contents += "</table>";
		}
		var div = dojo.create("div",{
			innerHTML:contents,
			className:"racquelResultSection"});
		return div;
	},
	_formatRouteResult:function(routeResultItem){
		var contents = "<H3>River routing results</H3>";
		if (!routeResultItem.successful){
			contents += "River searches were not successful!"
		}
		else {
			var searchPt = routeResultItem.searchLocation.geometry;
			var locPt = routeResultItem.netLocation.geometry;
			var distance = Math.sqrt((searchPt.x - locPt.x)*(searchPt.x-locPt.x)+(searchPt.y-locPt.y)*(searchPt.y-locPt.y));
			contents += "Input location was snapped to on-channel location of "+Math.round(locPt.x) + "," + Math.round(locPt.y)+"<br/>";
			contents += "This is "+Math.round(distance)+"m from the input location.";
			contents += "<table border ='1'><tr><th>Route attribute</th><th>Value</th></tr>";
    		contents += "<tr><td>Distance from source (km)</td><td>" + Math.round((routeResultItem.sourceRoute.attributes.Total_length/1000)*1000)/1000 + "</td></tr>";
    		contents += "<tr><td>Source location</td><td>" + Math.round(routeResultItem.source.geometry.x) + "," + Math.round(routeResultItem.source.geometry.y) + "</td></tr>";
    		contents += "<tr><td>Distance to mouth (km)</td><td>" + Math.round((routeResultItem.mouthRoute.attributes.Total_length/1000)*1000)/1000 + "</td></tr>";
    		contents += "<tr><td>Mouth location</td><td>" + Math.round(routeResultItem.mouth.geometry.x) + "," + Math.round(routeResultItem.mouth.geometry.y) + "</td></tr></table>";
    	}
		var div = dojo.create("div",{
			innerHTML:contents,
			className:"racquelResultSection"
		});
		return div;
	},
	_formatCatchResult:function(catchResultItem){
		var contents = "<H3>Catchment definition results</H3>";
		if (!catchResultItem.successful) {
			contents += "Catchment definition / extraction was not successful!"
		}
		else {
			var data = catchResultItem["extractedData"];
			var describer = new racquelDijits.racquelDataDescriptions();
			// need to work with the "fixed" list of available parameters as opposed to what is currently
			// set for extraction in the searchSettings as this could have been changed since the search was run
			var config = this.toolbar.racquelServiceConfig.racquelCatchmentService;
			for (var defaultParam in config["DefaultOutputParams"]){
				if (data.hasOwnProperty(defaultParam) && defaultParam.type === "Literal"){
					// catchment area is in data[defaultParam]
					//Math.round((catchResultItem.catchment.attributes.area / 1000000) * 100) / 100;
					//contents += "Catchment area is " + catchArea + "sq km.<br/>";
				}
			} 
			// QC catchment here for now. Needs to move to search dijit so it works with batch search.
			if (catchResultItem.catchmentQC){
				if (catchResultItem.catchmentQC == "QC_OK"){
					contents += "QC: OK (Source point is within catchment)<br/>";
				}
				else{
					contents += "QC: WARNING! Source point is not within catchment. Please check visually<br/>";
				}
			}
			else{
				contents += "QC: Catchment not quality controlled as route search was not done or not successful<br/>";
			}
			// now do those in AvailableExtractionParams
			// we're not sorting them - they may not always appear in same order. easy enough to sort if 
			// anyone moans though
			for (var possibleParamName in config["AvailableExtractionParams"]){
				if (data.hasOwnProperty(possibleParamName)){
					var parameterDetails = config["AvailableExtractionParams"][possibleParamName];
					if (parameterDetails.type === "Literal"){
						contents += parameterDetails["name"]+": ";
						contents += data[possibleParamName] + "<br/>"; 
						//Math.round((catchResultItem.uplength / 1000) * 1000) / 1000 +
					}
					else if (parameterDetails.type === "Continuous"){
						contents += "<h4>" + parameterDetails["name"] + "</h4>";
						var max = data[possibleParamName]["Max"];
						var min = data[possibleParamName]["Min"];
						var mean = data[possibleParamName]["Mean"];
						contents += "Maximum: "+max+ "<br/>";
						contents += "Minimum: "+min+ "<br/>";
						contents += "Average: "+mean+"<br/>";
						//contents += "Maximum elevation: "+(Math.round(catchResultItem.elev.ELEV_Max * 10)/10)+"m<br/>";
						//contents += "Minimum elevation: "+(Math.round(catchResultItem.elev.ELEV_Min * 10)/10)+"m<br/>";
						//contents += "Average (mean) elevation: "+(Math.round(catchResultItem.elev.ELEV_Mean * 10)/10)+"m<br/>";
					}
					else if (parameterDetails.type === "Categorical"){
						contents += "<table border='1'><tr><th colspan=2>" + parameterDetails["name"] + "</th></tr>";
						var classes = describer.lcm2k.classes;
						for (var dataClass in data[possibleParamName]){
							if (data[possibleParamName].hasOwnProperty(dataClass)){
								// round if necessary 
								// var percentage = Math.round(catchResultItem.lcm2k[lcmclass] * 100) / 100;
								var value = data[possibleParamName][dataClass];
								contents += "<tr><td>";
								contents += "Class "+dataClass+ " ("+ classes[dataClass] + ")</td>";
								contents += "<td>" + value + "%</td></tr>";
							}
						}
						contents += "</table>";
					}
				}
			}
			
		}
		var div = dojo.create("div",{
			innerHTML:contents,
			className:"racquelResultSection"
		});
		return div;
	},
	_zoomSelected:function(searchIdsArray){
		// get the selected results and zoom to their extent
		// Not relevant if we are not connected to a map. Should make the button programatically only if a 
		// map is connected
		var graphicsToZoom = [];
		dojo.forEach(searchIdsArray,dojo.hitch(this,function(searchId){
			var racquelResultItem = this.toolbar.racquelResultStore.getWholeResult(searchId);
			if (racquelResultItem.hasOwnProperty('routeResult') && racquelResultItem['routeResult'].successful == true)
			{
				var item = racquelResultItem['routeResult'];
				graphicsToZoom.push(item.sourceRoute);
				graphicsToZoom.push(item.mouthRoute);
				graphicsToZoom.push(item.source);
				graphicsToZoom.push(item.mouth);
			}
			else if (racquelResultItem.hasOwnProperty('catchResults') && racquelResultItem['catchResults'].successful == true)
			{
				var catchGraphic = racquelResultItem['catchResults'].catchment;
				graphicsToZoom.push(catchGraphic);
			}
			else if (racquelResultItem.hasOwnProperty('searchLocation'))
			{
				graphicsToZoom.push(racquelResultItem.searchLocation);	
			}
		}));
		if(graphicsToZoom.length > 0){
			this._zoomToGraphics(graphicsToZoom);			
		}
	},
	_selectAll:function(){
		// select all result row checkboxes
		console.log("Select all");
		this._grid.selection.selectRange(0,this._grid.rowCount-1);
		//var inputs = dojo.query(".racquelIdCheckBox");
		//dojo.forEach(inputs,dojo.hitch(this,function(input){
		//	var checkboxwidget = dijit.getEnclosingWidget(input);
		//	if (!checkboxwidget.checked){
		//		checkboxwidget.checked=true;
		//	}
		//}));
	},
	_selectNone:function(){
		// deselect all result row checkboxes
		console.log("Clear selection");
		this._grid.selection.clear();
		//var inputs = dojo.query(".racquelIdcheckBox");
		//dojo.forEach(inputs,dojo.hitch(this,function(input){
		//	var checkboxwidget = dijit.getEnclosingWidget(input);
		//	if (checkboxwidget.checked){
		//		checkboxwidget.checked = false;
		//	}
		//}));
	},
	_deleteSelected:function(){
		// get the selected results and delete them from the result store. This will in turn trigger removing
		// them from the grid 
		//Remove from map, if showing.
		console.log("delete selected");
		//var list = this._getSelected(); // <- this for home-brew selection checkboxes, returns list of ids
		var selected = this._grid.selection.getSelected(); // <- this for the grids native row selection, returns store items
		var selectedIds = [];
		dojo.forEach(selected,dojo.hitch(this,function(item){
			if(item && item.SearchId){
				selectedIds.push(item.SearchId);
			}
		}));
		console.log("deleting "+selectedIds.length+" results");
		dojo.forEach(selectedIds,dojo.hitch(this,function(item){
			if (item) {
				this.toolbar.racquelResultStore.deleteResult(item);
			}
		}));
	},
	_saveSelected:function(){
		// Trigger for functionality to save selected results into a session state so they can be 
		// reloaded on next visit to the page
		// Will use browser localStorage (HTML5 -> not IE) to store the main resultStore contents
		alert("This will save selected results so they're still here next time you visit. Still to be developed!");
		
		
	},
	_exportSelected:function(){
		// Trigger for functionality to export selected results (not yet written).
		// Could consist of:
		// - formatting results into flat csv format and download via server pingback
		// - formatting results into flat csv format and display in dialog to copy/paste
		// - sending results to server, returning a zipped shapefile for each of site, route, and catchment results
		// (one feature in each for each search). This needs an SOE to be writen to handle this
		alert("This will export selected results to shapefiles. It only works in Google Chrome!");
		var selected = this._grid.selection.getSelected(); // <- this for the grids native row selection, returns store items
		var selectedIds = [];
		dojo.forEach(selected,dojo.hitch(this,function(item){
			if(item && item.SearchId){
				selectedIds.push(item.SearchId);
			}
		}));
		var graphicsToExport = [];
		dojo.forEach(selectedIds,dojo.hitch(this,function(item){
			if (item) {
				var graphicsFromSearch = this.toolbar.racquelResultStore.getResultAsAttributedGraphics(item);
				// this will be an array containing the graphics, we want to put the individual items, rather than  
				// the array itself, onto the export array
				dojo.forEach(graphicsFromSearch,dojo.hitch(this,function(graphic){
					graphicsToExport.push(graphic);
				}));
			}
		}));
		// graphicsToExport now contains an array of esri graphics which have the other data as attributes
		// this is suitable for input to the shapefile maker
		if (!this.toolbar.ShapefileLoaded){
			// we need to load the shapefile library (it's not a dojo package so haven't pulled it in already 
			// using dojo.require)
			console.log("Loading shapefile library");
			this.toolbar._loadJS2Shp(dojo.hitch(this,function(){
				// and we also need to load the saveAs library for the same reason
				if (!this.toolbar.fileSaverLoaded){
					console.log("Loading file save library");
					this.toolbar._loadSaveAs(dojo.hitch(this,function(){
						console.log("loaded both libraries, calling export routine");
						this.exportGraphics(graphicsToExport);
					}));					
				}
				else {
					console.log("file save library already loaded, calling export routine");
					this.exportGraphics(graphicsToExport);
				}
			}));
		}
		else {
			console.log("already loaded shapefile and file save libraries");
			// assume that if shapefile lib is loaded then so is saveAs library...
			this.exportGraphics(graphicsToExport);
		}
	},
	exportGraphics:function(graphics){
		var shapewriter = new Shapefile({shapetype:"POINT"});
		shapewriter.addESRIGraphics(graphics);
		var pointfile = shapewriter.getShapefile();
		shapewriter.shapetype = "POLYLINE";
		var linefile = shapewriter.getShapefile();
		shapewriter.shapetype = "POLYGON";
		var polygonfile = shapewriter.getShapefile();
		if (pointfile["shape"]) {
			saveAs(pointfile["shape"], "racquel_results_points.shp");
			saveAs(pointfile["shx"], "racquel_results_points.shx");
			saveAs(pointfile["dbf"], "racquel_results_points.dbf");
		}
		if (linefile["shape"]) {
			saveAs(linefile["shape"], "racquel_results_lines.shp");
			saveAs(linefile["shx"], "racquel_results_lines.shx");
			saveAs(linefile["dbf"], "racquel_results_lines.dbf");
		}
		if (polygonfile['shape']) {
			saveAs(polygonfile["shape"], "racquel_results_polygons.shp");
			saveAs(polygonfile["shx"], "racquel_results_polygons.shx");
			saveAs(polygonfile["dbf"], "racquel_results_polygons.dbf");
		}
	},
	_getSelected:function(){
		// Utility function to query checkboxes to get the results corresponding to checked boxes
		// NOT USED
		var inputs = dojo.query(".racquelIdCheckBox");
		var checkedlist = [];
		dojo.forEach(inputs,dojo.hitch(this,function(input){
			var checkboxwidget = dijit.getEnclosingWidget(input);
			if (checkboxwidget.checked){
				checkedlist.push(checkboxwidget.cbid); // TODO make it have one!
			}
		}));
		return checkedlist;
	},
	_saveToLocalStorage:function(){
		// save the contents of the toolbar's result store corresponding to the 
		// checked grid lines to browser localStorage.
		// check if there are already racquelResults stored there and offer to append or overwrite 
	},
	_loadFromLocalStorage:function(){
		// populate the toolbar's result store (and thus the grid) with results from the browser
		// localStorage
	},
	_zoomToGraphics:function(graphics){
		var extent = this._getGraphicsExtent(graphics);
		if(extent && this.map){
			extent.expand(1.1);
			this.map.setExtent(extent,true);
		}
	},
	_getGraphicsExtent:function(graphics){
		var geometry,extent,ext;
		dojo.forEach(graphics,dojo.hitch(this,function(graphic,i){
			geometry = graphic.geometry;
			if (geometry instanceof esri.geometry.Point){
				ext = new esri.geometry.Extent(geometry.x - 1, geometry.y - 1, 
												geometry.x + 1, geometry.y + 1, 
												geometry.spatialReference);
			}
			else {
				if (geometry instanceof esri.geometry.Extent){
					ext=geometry;
				}
				else {
					ext = geometry.getExtent();
				}
			}
			if (extent){
				extent = extent.union(ext);
			}
			else {
				extent = new esri.geometry.Extent(ext);
			}
		}));
		return extent;	
	}
	
});
