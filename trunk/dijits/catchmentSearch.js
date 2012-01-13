dojo.provide("racquelDijits.catchmentSearch");

dojo.declare("racquelDijits.catchmentSearch",[],{
	constructor:function(params){
		this.soeURL = "http://192.171.192.6/ArcGIS/rest/services/Test/irn_watershed_svc/MapServer/exts/WatershedSOE/createWatershed";
		
		//this.ctmSymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, new esri.symbol.SimpleLineSymbol("dashdot", new dojo.Color([255, 0, 0]), 2), new dojo.Color([255, 255, 0, 0.25]));
	},
	
	runCatchmentSearch:function(searchParams){
		var searchPoint = searchParams.searchPoint || null;
		var doLCM2K = searchParams.LCM2000 || false;
		var doElev = searchParams.Elevation || false;
		var doUpstream = searchParams.UpstreamLength || false;
		var analysisExtent = searchParams.SearchExtent || null;
		// optionally can provide source point, will check if it's inside catchment
		this.sourcePoint = searchParams.SourcePoint || null;
		if (!searchPoint.geometry) {return {successful:false};}
		var searchId = searchPoint.attributes["searchId"];
		console.log("Catchment search initiating for id: "+searchId);
		
		var soeRequestContent = {
			'hydroshed_id':	"search_"+searchId, //sending a straight number causes the SOE to fail to read as string
			'location':		"{x:"+searchPoint.geometry.x+",y:"+searchPoint.geometry.y+"}",
			'lcm2k':		doLCM2K,
			'elev':			doElev,
			'totalupstream':doUpstream,
			'f':			"json",
			'extent':		analysisExtent
		}
		var catchSearchDef = new dojo.Deferred();
		
		var soeRequestDef = esri.request({
			url:		this.soeURL,
			content:	soeRequestContent,
			callbackParamName: "callback",
			load:		dojo.hitch(this,function(soeResponse){
							var catchResult = this._processCatchmentResult(soeResponse);
							catchResult.searchLocation = searchPoint;
							catchSearchDef.callback(catchResult);
						}),
			error:		dojo.hitch(this,function(){
							var catchErrorResult = this._processCatchmentError(searchId);
							catchSearchDef.callback(catchErrorResult);
						})
		});
		return catchSearchDef;
	},
	/***
	 * Formats the catchment result object returned from the SOE. The SOE returns a polygon with 
	 * all requested extraction items as direct attributes rather than as nested JSON objects.
	 * This function reformats them to give a graphic with just id and area as attributes, and the
	 * LCM, Elevation etc as separate objects. All are returned in a single object
	 * @param {Object} soeResponse
	 * @return {
	 * 		searchId:number,
	 * 		successful:bool
	 * 		catchment:	esri.Graphic
			lcm2k:		{json} || '',
			elev:		{json} || '',
			uplength:	number || ''	
			}
	 */
	_processCatchmentResult:function(soeResponse){
		console.log("catchment result processing");
		var blankInfoTemplate = new esri.InfoTemplate();
		var sr = new esri.SpatialReference({
			wkid:27700
		});
		var features = soeResponse.features;
		if (features.length > 1){
			console.log("more than one feature in SOE catchment result. Oops.");
		}
		for (var i=0,il=features.length;i<il;i++){
			// there should only be one as the SOE unions polygons before returning. Just in case though.
			var attr = features[i].attributes;
			var searchId,area,uplength;
			var lcmattr={},elevattr={};
			for (var attribute in attr){
				var value = attr[attribute];
				if(attribute.indexOf('SEARCH_ID')!=-1)
				{
						searchId = parseInt(value.split('_')[1]);
				}
				if(attribute.indexOf('AREA')!=-1)
				{
					area = value;
				}
				else if (attribute.indexOf('LCM2K')!= -1)
				{
					var lcm2kclass = attribute.split('_')[1];
					lcmattr[lcm2kclass]=value;
				}
				else if (attribute.indexOf('ELEV')!=-1)
				{
					elevattr[attribute]=value
				}
				else if (attribute.indexOf('UPSTRM')!=-1)
				{
					uplength=value;
				}
			}
			var geom = features[i].geometry;
			var polygon = new esri.geometry.Polygon(sr);
			for (var j=0,jl=geom.rings.length;j<jl;j++){
				polygon.addRing(geom.rings[j]);
			}
			//var ctmGraphic = new esri.Graphic(polygon,this.ctmSymbol,{'searchId':searchId,'area':area},blankInfoTemplate);
			var ctmGraphic = new esri.Graphic(polygon,null,{'searchId':searchId,'area':area});
			var returnObject = {
				searchId: searchId,
				successful:true,
				catchment:	ctmGraphic,
				racquelResultType: "racquelCatchResult",
			}
			if (lcmattr != {}){
				returnObject.lcm2k = lcmattr
			}
			if (elevattr != {}){
				returnObject.elev = elevattr
			}
			if(uplength){
				returnObject['uplength']=uplength
			}
			console.log("Catchment search completed for id: "+searchId);
			return returnObject;
		}
			
	},
	_processCatchmentError:function(searchId){
		console.log("catchment request error");
		return {
			searchId: searchId,
			racquelResultType: "racquelCatchResult",
			successful: false
		};
	},
	/***
	 * Use the ray casting algorithm to check if a point (river source) is inside a polygon (catchment).
	 * The ESRI javascript API doesn't do this natively (yet), the normal way would be to make a call to the
	 * arcgis server geometry service. But we are doing it here to avoid sending the polygon back over
	 * the network. And this is more fun. (Better idea: rewrite the SOE to take the point in its input!)
	 * Code based on http://appdelegateinc.com/blog/2010/05/16/point-in-polygon-checking/
	 * UPDATE: not used, I just discovered that the Polygon object in fact does have a contains(point) method.
	 * left this in for interest!
	 * @param {Object} point
	 * @param {Object} poly
	 */
	_pointInPoly:function(point,poly){
        var numPoints = poly.rings[0].length;
        var inPoly = false;
        var i;
        var j = numPoints - 1;
        
     for(var i=0; i < numPoints; i++) { 
		var vertex1 = this.getVertex(i);
		var vertex2 = this.getVertex(j);
		if (vertex1.x < point.x && vertex2.x >= point.x || vertex2.x < point.x && vertex1.x >= point.x)	 {
			if (vertex1.y + (point.x - vertex1.x) / (vertex2.x - vertex1.x) * (vertex2.y - vertex1.y) < point.y) {
				inPoly = !inPoly;
			}
		}
		j = i;
	}
	return inPoly;
	}
})
