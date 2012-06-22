dojo.provide("racquelDijits.catchmentSearch");

dojo.declare("racquelDijits.catchmentSearch",[],{
	constructor:function(params){
		this.catchmentService = params.serviceConfig.racquelCatchmentService;
	},
	
	runCatchmentSearch:function(searchParams){
		//searchParams has properties searchPoint, analysisExtent, and extractionData 
		// where extractionData has a property for each parameter we want to extract from SOE
		// and the available ones are defined in racquelServiceUrls.racquelCatchmentService.AvailableExtractionParams
		var searchPoint = searchParams.searchPoint || null;
		var analysisExtent = searchParams.SearchExtent || null;
		// optionally can provide source point, will check if it's inside catchment
		// NOT USED HERE - QC checking moved to result manager 
		//this.sourcePoint = searchParams.SourcePoint || null;
		if (!searchPoint.geometry) {return {successful:false};}
		var searchId = searchPoint.attributes["searchId"];
		//console.log("Catchment search initiating for id: "+searchId);
		
		// Build the parameters for the SOE request. The required SOE input parameter names may vary 
		// so we read them from the service config object
		var soeIdentifierParam = this.catchmentService.FixedInputParams.IDParamName;
		var soeLocationParam = this.catchmentService.FixedInputParams.LocationParamName;
		var soeExtentParam = this.catchmentService.FixedInputParams.ExtentParamName;
		var soeSRParam = this.catchmentService.FixedInputParams.SRParamName;
		var soeOutputFormatParamName = this.catchmentService.FixedInputParams.OutputFormatParamName;
		
		var soeRequestContent = {};
		//sending a straight number causes the SOE to fail to read as string
		soeRequestContent[soeIdentifierParam] = "search_"+searchId; 
		// build the search location as a JSON point
		soeRequestContent[soeLocationParam] = "{x:"+searchPoint.geometry.x+",y:"+searchPoint.geometry.y+"}";
		soeRequestContent['f'] = "json"; // assume this one will always be "f"
		soeRequestContent[soeExtentParam] = analysisExtent;
		soeRequestContent[soeSRParam] = searchPoint.geometry.spatialReference.wkid;
		// false = return as json-structured object rather than as attributes on the catchment feature
		soeRequestContent[soeOutputFormatParamName] = false;
		for (var extractionparam in searchParams.extractionParams){
			if (searchParams.extractionParams.hasOwnProperty(extractionparam)){
				if (searchParams.extractionParams[extractionparam]){
					soeRequestContent[extractionparam] = true;
				}
				else {
					soeRequestContent[extractionparam] = false;
				}
			}
		}
		var catchSearchDef = new dojo.Deferred();
		
		var soeRequestDef = esri.request({
			url:		this.catchmentService.URL+this.catchmentService.createWatershedOperation,
			content:	soeRequestContent,
			callbackParamName: "callback",
			load:		dojo.hitch(this,function(soeResponse){
							//var catchResult = this._processCatchmentResult(soeResponse,searchParams.extractionParams);
							var catchResult = this._processPreStructuredCatchmentResult(soeResponse,searchParams.extractionParams);
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
	 * SOE has been extended (since _processCatchmentResult was written) to structure the output
	 * itself... so we have less to do here now
	 * 
	 * @param {Object} soeResponse
	 * @param {Object} extractionParams
	 */
	_processPreStructuredCatchmentResult:function(soeResponse,extractionParams){
		var geom = soeResponse.geometry;
		var soe_wkid = soeResponse.output_wkid;
		var polygon = new esri.geometry.Polygon( new esri.SpatialReference({
			wkid:soe_wkid
		}));
		//
		for (var j=0,jl=geom.rings.length;j<jl;j++){
			polygon.addRing(geom.rings[j]);
		}
		//polygon.addRing(geom);
		var returnedSearchId = soeResponse["search_id"].split('_')[1];
		var ctmGraphic = new esri.Graphic(polygon,null,{
			'searchId':returnedSearchId
		});
		var returnObject = {
			//searchId:soeResponse["search_id"],
			searchId:returnedSearchId,
			successful:true,
			catchment:ctmGraphic,
			racquelResultType:"racquelCatchResult",
			// we don't have to build the structured object any more
			extractedData:soeResponse["Extractions"],
			totalArea: soeResponse["total_area"]
		}
		console.log("Catchment search completed for id: ")+soeResponse["search_id"];
		return returnObject;
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
	_processCatchmentResult:function(soeResponse,extractionParams){
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
			// all fields are returned as attributes of the graphic(s) - build them back into structured
			// object separating each dataset
			var attr = features[i].attributes;
			var structured = {};
			var searchId;
			for (var extractionParam in extractionParams){
				if (extractionParams.hasOwnProperty(extractionParam)){
					var details = this.catchmentService.AvailableExtractionParams[extractionParam];
					structured[extractionParam] = {};
					if (details["type"] === "Literal"){
						// only one field, just retrieve it
						structured[extractionParam] = attr[details["responsePrefix"]];
					}
					else if (details["type"] === "Continuous"){
						// always three corresponding fields, min, max and mean
						// the members of attr beginning with details[responsePrefix]
						structured[extractionParam]["Max"] = attr[details["responsePrefix"]+"Max"];
						structured[extractionParam]["Min"] = attr[details["responsePrefix"]+"Min"];
						structured[extractionParam]["Mean"] = attr[details["responsePrefix"]+"Mean"]; 
					}
					else if (details["type"] === "Categorical"){
						// arbitrary number of corresponding fields, one for each class present
						// go over all the returned attributes and add ones with the right prefix to the 
						// appropriate property of structured output
						for (var catAtt in attr){
							if (catAtt.indexOf(details["responsePrefix"]) === 0)
							{
								var cat = catAtt.substring(details["responsePrefix"].length);
								structured[extractionParam][cat] = attr[catAtt];
							}
						}
					}
				}
			}
			for (var defaultParam in this.catchmentService.DefaultOutputParams){
				if (this.catchmentService.DefaultOutputParams.hasOwnProperty(defaultParam)){
					var details = this.catchmentService.DefaultOutputParams[defaultParam];
					if (details["type"] === "Identifier"){
						searchId = attr[details["responsePrefix"]].split('_')[1];
					}
					else {
						structured[defaultParam] = attr[details["responsePrefix"]];
					}
				}
			}
			var geom = features[i].geometry;
			var polygon = new esri.geometry.Polygon(sr);
			for (var j=0,jl=geom.rings.length;j<jl;j++){
				polygon.addRing(geom.rings[j]);
			}
			//var ctmGraphic = new esri.Graphic(polygon,this.ctmSymbol,{'searchId':searchId,'area':area},blankInfoTemplate);
			var ctmGraphic = new esri.Graphic(polygon, null, {
				'searchId': searchId
			});
			var returnObject = {
				searchId: searchId,
				successful:true,
				catchment:	ctmGraphic,
				racquelResultType: "racquelCatchResult",
			}
			returnObject["extractedData"] = structured;
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
