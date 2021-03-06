// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require",
    "Plots/GenericPlot",
    "Plots/Histogram", "Plots/BarGraph", "Plots/Histogram2D", "Plots/ItemScatterPlot", "Plots/MultiCategoryHistogram", "Plots/GeoTemporal/GeoTemporal"
],
    function (require,
              GenericPlot,
              Histogram, BarGraph, Histogram2D, ItemScatterPlot, MultiCategoryHistogram, GeoTemporal
        ) {


        var PlotStarter = {};

        GenericPlot.registerPlotType(Histogram);
        GenericPlot.registerPlotType(BarGraph);
        GenericPlot.registerPlotType(Histogram2D);
        GenericPlot.registerPlotType(ItemScatterPlot);
        GenericPlot.registerPlotType(MultiCategoryHistogram);
        GenericPlot.registerPlotType(GeoTemporal);

        return PlotStarter;
    });


