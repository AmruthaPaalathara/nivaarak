import React, { useEffect, useRef, useMemo } from 'react';

const DocumentTypeChart = ({
                               documentStats = [],
                               title = "Document Types Submitted",
                               seriesName = "Submissions",
                               height = 400,
                               width = "100%" // Added width prop for better responsiveness
                           }) => {
    const chartRef = useRef(null);

    // Memoize chart configuration for better performance
    const chartOptions = useMemo(() => ({
        chart: { type: 'column' },
        title: { text: title },
        colors: ['#28a745', '#17a2b8', '#ffc107', '#6f42c1'],
        xAxis: { categories: documentStats.map(item => item._id), title: { text: 'Document Type' } },
        yAxis: { min: 0, title: { text: 'Count' } },
        series: [{ name: seriesName, data: documentStats.map(item => item.count), colorByPoint: true }],
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

    // Display a fallback message when there's no data
    if (!documentStats || documentStats.length === 0) {
        return <p>No data available for document submissions.</p>;
    }

    return <div ref={chartRef} style={{ width, height: `${height}px`, maxWidth: '800px' }} />;
};

export default DocumentTypeChart;