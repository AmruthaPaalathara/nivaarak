import React, { useEffect, useRef, useState, useMemo } from 'react';
import API from '../utils/api';

const ApplicationByTypeChart = ({
                                    title = "Applications by Certificate Type",
                                    apiEndpoint = "/userCharts/user-applications",
                                    externalData = null
                                }) => {
    const chartContainer = useRef(null);
    const [totalData, setTotalData] = useState([]);
    const [statusData, setStatusData] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchChartData = async () => {
            try {
                console.log("API Endpoint being called:", apiEndpoint);
                const response = await API.get(apiEndpoint);
                const result = response.data;
                if (result?.success !== false) {
                    setTotalData(result.totalApplications || []);
                    setStatusData(result.statusBreakdown || []);
                    console.log("Chart Data Response:", result);
                } else {
                    console.warn("API responded with success=false:", result);
                    setError(result.message || "Failed to fetch data.");
                }
            } catch (err) {
                console.error("Chart fetch error:", err);
                setError("Failed to fetch chart data. Please try again.");
            }
        };

        if (!externalData) {
            fetchChartData();
        } else {
            setTotalData(externalData.totalApplications || []);
            setStatusData(externalData.statusBreakdown || []);
        }
    }, [apiEndpoint, externalData]);

    // Chart config (memoized for performance)
    const chartOptions = useMemo(() => ({
        chart: { type: 'column' },
        title: { text: title },
        xAxis: {
            categories: totalData.map(item => item.documentType),
            title: { text: 'Document Type' }
        },
        yAxis: {
            min: 0,
            title: { text: 'Number of Applications' },
            stackLabels: { enabled: true }
        },
        tooltip: { shared: true },
        plotOptions: {
            column: { stacking: 'normal' }
        },
        series: ["Approved", "Pending", "Rejected"].map(status => ({
            name: status,
            data: totalData.map(doc => {
                const entry = statusData.find(item =>
                    item.documentType === doc.documentType && item.status === status
                );
                return entry ? entry.count : 0;
            })
        })),
        credits: { enabled: false }
    }), [totalData, statusData, title]);

    useEffect(() => {
        if (typeof window.Highcharts === "undefined") {
            console.error("Highcharts is not loaded globally.");
            return;
        }

        if (window.Highcharts && chartContainer.current && totalData.length > 0) {
            window.Highcharts.chart(chartContainer.current, chartOptions);
        }
    }, [chartOptions, totalData]);

    // Handle error or empty chart
    if (error) {
        return <p style={{ color: "red" }}>{error}</p>;
    }

    const processedData = totalData?.length > 0 ? totalData : [{ documentType: "No Data", count: 0 }];
    if (processedData.length === 1 && processedData[0].documentType === "No Data") {
        return <p>No application data available.</p>;
    }

    return (
        <div ref={chartContainer} style={{ width: '100%', height: '500px', maxWidth: '100%' }} />
    );
};

export default ApplicationByTypeChart;
