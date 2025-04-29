import React, { useEffect, useRef } from 'react';

const DocumentTypeChart = ({ documentStats }) => {
    const chartRef = useRef(null);

    useEffect(() => {
        if (window.Highcharts && chartRef.current && documentStats.length > 0) {
            const categories = documentStats.map(item => item._id);
            const data = documentStats.map(item => item.count);

            window.Highcharts.chart(chartRef.current, {
                chart: { type: 'column' },
                title: { text: 'Document Types Submitted' },
                colors: ['#28a745', '#17a2b8', '#ffc107', '#6f42c1'],
                xAxis: { categories, title: { text: 'Document Type' } },
                yAxis: { min: 0, title: { text: 'Count' } },
                series: [{
                    name: 'Submissions',
                    data,
                    colorByPoint: true
                }],
                credits: { enabled: false }
            });
        }
    }, [documentStats]);

    return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
};

export default DocumentTypeChart;
