dojo.provide("racquelDijits.routeSearch");
dojo.require("esri.tasks.gp");
dojo.declare("racquelDijits.routeSearch",[],{
	constructor:function(params){
		this.searchPoint = params.searchPoint;
		this.map = params.map
		
		this.routeResults = {routeResults:null,location:null};
		this.routeGp = new esri.tasks.Geoprocessor("http://wlwin5.nwl.ac.uk/ArcGIS/rest/services/RACQUEL/RACQUEL_Source_And_Mouth_Routes/GPServer/Find%20RACQUEL%20Mouth%20and%20Source")
		this.routeGp.setUpdateDelay(2000);
		
	},
	runSearch:function(){
		var routeDeferredOverall = new dojo.Deferred();
		dojo.connect(this.routeGp,"onJobComplete",dojo.hitch(this,function(jobInfo){
			this._getRouteResults(jobInfo);
			
		}));
		var pointSymbol = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 15, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 0, 0]), 1), new dojo.Color([255, 0, 0, 0.35]));
        var graphic = new esri.Graphic(searchGeoPoint, pointSymbol);
        var features = [];
        features.push(graphic);
        var featureset = new esri.tasks.FeatureSet();
        featureset.features = features;
       	var routeParams = {
			"Input_locations":featureset
		};
		this.routeGp.submitJob(routeParams);
		return routeDeferredOverall;
	},
	_getRouteResults:function(jobInfo){
		if(jobInfo.jobStatus!="esriJobSucceeded"){
		onsole.log("problem finding routes");
			return;
		}
		var mrDeferred = this.routeGp.getResultData(jobInfo.jobId,"RouteToMouthOutput");
		var srDeferred = this.routeGP.getResultData(jobInfo.jobId,"RouteFromSourceOutput");
		var spDeferred = this.routeGp.getResultData(jobInfo.jobId,"Selected_Source_Output");
		var mpDeferred = this.routeGp.getResultData(jobInfo.jobId,"SelectedMouthOutput");
		var getRouteResultsDL = new dojo.DeferredList([mrDeferred,srDeferred,spDeferred,mpDeferred]);
		getRouteResultsDL.then(dojo.hitch(this,function(){
			// build route resutls object and store
			this._formatAndStoreRouteResults();
			this._routeDeferredOverall.callback(); // TODO will this work??
		}));
	},
	_formatAndStoreRouteResults:function(res){
		var routeGraphics = [];
        var sourcePoint, mouthPoint, sourceRoute, mouthRoute;
        dojo.forEach(res, function(parameterResult){
            var graphic = parameterResult[1].value.features[0];
            switch (parameterResult[1].paramName) {
                case "RouteToMouthOutput":
                    graphic.symbol = new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 0, 0]), 2);
                   mouthRoute = graphic;
                    break;
                case "RouteFromSourceOutput":
                    graphic.symbol =  new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0, 0, 255]), 2);
                 sourceRoute = graphic;
                    break;
                case "SelectedMouthOutput":
                    graphic.symbol = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 15, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0, 0, 0]), 1), new dojo.Color([0, 255, 0]));
     	              mouthPoint = graphic;
                    break;
                case "Selected_Source_Output":
                    graphic.symbol = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_DIAMOND, 15, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0, 0, 0]), 1), new dojo.Color([255, 0, 0]));
                 sourcePoint = graphic;
                    break;
            }
            routeGraphics.push(graphic);
			this.routeResults.routeResults=routeGraphics;
        });
        
	}
})

