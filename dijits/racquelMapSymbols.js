dojo.provide("racquelDijits.racquelMapSymbols");
// this class is just a place to define the symbols that will be used to add graphics to the map
// all properties are "static" i.e. same across all instantiations, as they're not in the constructor
dojo.declare("racquelDijits.racquelMapSymbols",[],{
	catchmentSymbol: 
		new esri.symbol.SimpleFillSymbol(
			esri.symbol.SimpleFillSymbol.STYLE_SOLID, // fill style
			new esri.symbol.SimpleLineSymbol(
				"dashdot", new dojo.Color([255, 0, 0]), 2), // outline style, colour and thickness
			new dojo.Color([255, 255, 0, 0.25]) // fill colour and opacity
		) 
	,
	sourceSymbol:
		new esri.symbol.SimpleMarkerSymbol(
			esri.symbol.SimpleMarkerSymbol.STYLE_DIAMOND, // marker shape 
			12, // marker size
			new esri.symbol.SimpleLineSymbol( // marker outline
				esri.symbol.SimpleLineSymbol.STYLE_SOLID, 
				new dojo.Color([0, 0, 0]), 1), // outline style,colour,thickness 
			new dojo.Color([255, 0, 0])
		) // marker colour
	,
	mouthSymbol:
		new esri.symbol.SimpleMarkerSymbol(
			esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 
			12, 
			new esri.symbol.SimpleLineSymbol(
				esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0, 0, 0]), 1), 
			new dojo.Color([0, 255, 0])
		)
	,
	sourceRouteSymbol: 
		new esri.symbol.SimpleLineSymbol(
			esri.symbol.SimpleLineSymbol.STYLE_SOLID, // line style 
			new dojo.Color([0, 0, 255]),  // line colour
			2 // line thickness
		)
	,
	mouthRouteSymbol:
		new esri.symbol.SimpleLineSymbol(
			esri.symbol.SimpleLineSymbol.STYLE_SOLID, 
			new dojo.Color([255, 0, 0]), 
			2
		)
	,
	riversSymbol:
		new esri.symbol.SimpleLineSymbol(). // another approach to creating symbol
			setStyle(esri.symbol.SimpleLineSymbol.STYLE_SOLID).
			setWidth(2).
			setColor(new dojo.Color([0, 255, 0, 1]))
	,
	locatedPointSymbol:
		new esri.symbol.SimpleMarkerSymbol().
			setStyle(esri.symbol.SimpleMarkerSymbol.STYLE_X).
			setSize(10).
			setColor(new dojo.Color([0, 255, 0, 1])).
			setOutline(new esri.symbol.SimpleLineSymbol(
				esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0, 255, 0]), 1)
			)
	,
	searchPointSymbol:
		new esri.symbol.SimpleMarkerSymbol().
			setStyle(esri.symbol.SimpleMarkerSymbol.STYLE_CROSS).
			setSize(12).
			setColor(new dojo.Color([0, 255, 0, 1])).
			setOutline(new esri.symbol.SimpleLineSymbol(
				esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0, 255, 0]), 1)
			)
	,
	crossHairSymbol:
		new esri.symbol.PictureMarkerSymbol('http://wlwater.ceh.ac.uk/RACQUEL/images/crosshair.png').setHeight(71).setWidth(75)
});
