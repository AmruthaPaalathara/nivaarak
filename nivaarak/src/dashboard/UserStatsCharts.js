import React, { useEffect, useRef, useMemo } from 'react';

const ApplicationSummaryChart = ({
                                     total = 0,
                                     emergency = 0,
                                     documentStats = [],
                                     role = "user",
                                     chartTitle = "Application Stats"
                                 }) => {
    const chartRef = useRef(null);

    // Memoized Highcharts Configuration
    const chartOptions = useMemo(() => ({
        chart: {
            type: 'column',
            events: {
                drilldown: function (e) { console.log('Drilldown event triggered', e); },
                drillup: function () { console.log('Drillup event triggered'); }
            }
        },
        title: { text: chartTitle },
        xAxis: { type: 'category', scrollbar: { enabled: true } },
        yAxis: { title: { text: 'Count' } },
        legend: { enabled: false },
        plotOptions: { series: { borderWidth: 0, dataLabels: { enabled: true } } },
        tooltip: { headerFormat: '<span style="font-size:14px">{series.name}</span><br>', pointFormat: '<span>{point.name}</span>: <b>{point.y}</b>' },
        exporting: { enabled: true },
        series: [{
            name: 'Applications',
            colorByPoint: true,
            colors: ['#390536', '#94099c'],
            data: [
                { name: 'Total Document Submitted', y: total, drilldown: 'documentTypes', color: '#390536' },
                { name: 'Emergency Applications', y: emergency, drilldown: null, color: '#94099c' }
            ]
        }],
        drilldown: {
            series: [{
                id: 'documentTypes',
                name: 'Document Types',
                data: documentStats.map(item => [item.documentType, item.count])
            }]
        }
    }), [total, emergency, documentStats, chartTitle]);

    useEffect(() => {
        if (typeof window.Highcharts === "undefined") {
            console.error("Highcharts not loaded.");
            return;
        }

        if (window.Highcharts && chartRef.current) {
            window.Highcharts.chart(chartRef.current, chartOptions);
        }
    }, [chartOptions]);

    if (total === 0 && emergency === 0) {
        return <p>No application data available.</p>;
    }

    return <div ref={chartRef} style={{ width: '100%', height: '500px' }} />;
};

export default ApplicationSummaryChart