// src/dashboard/DocumentTypeChart.js

import React, { useEffect, useRef, useMemo } from 'react';

const DocumentTypeChart = ({
                               documentStats = [],
                               title = "Document Types Submitted",
                               seriesName = "Submissions",
                               height = 400,
                               width = "100%"
                           }) => {
    const chartRef = useRef(null);

    const chartOptions = useMemo(() => ({
        chart: { type: 'column' },
        title: { text: title },
        colors: ['#28a745', '#17a2b8', '#ffc107', '#6f42c1'],
        xAxis: {
            categories: documentStats.map(item => item._id || 'Unknown'),
            title: { text: 'Document Type' }
        },
        yAxis: {
            min: 0,
            title: { text: 'Number of Submissions' }
        },
        series: [{
            name: seriesName,
            data: documentStats.map(item => item.count || 0),
            colorByPoint: true
        }],
        credits: { enabled: false }
    }), [documentStats, title, seriesName]);

    useEffect(() => {
        if (typeof window.Highcharts === "undefined") {
            console.error("Highcharts not loaded.");
            return;
        }

        if (window.Highcharts && chartRef.current && documentStats.length > 0) {
            window.Highcharts.chart(chartRef.current, chartOptions);
        }
    }, [documentStats, chartOptions]);

    if (!documentStats.length) {
        return <p className="text-center text-muted">No data available for document submissions.</p>;
    }

    return <div ref={chartRef} style={{ width, height: `${height}px`, maxWidth: '800px' }} />;
};

export default DocumentTypeChart;
