import React, { useEffect, useRef, useState, useMemo } from 'react';
import API from '../utils/api';

const ApplicationByTypeChart = ({
                                    title = "Applications by Certificate Type",
                                    apiEndpoint = "/userCharts/user-applications",
                                    externalData = null
                                }) => {
    const chartContainer = useRef(null);

    // ─── STATE HOOKS (always run) ─────────────────────────────────────────────
    const [totalData, setTotalData]     = useState([]);
    const [statusData, setStatusData]   = useState([]);
    const [error, setError]             = useState(null);

    // ─── FETCH EFFECT (always run) ───────────────────────────────────────────
    useEffect(() => {
        const fetchChartData = async () => {
            try {
                console.log("API Endpoint being called:", apiEndpoint);
                const { data: result } = await API.get(apiEndpoint);
                if (result.success !== false) {
                    setTotalData(result.totalApplications || []);
                    setStatusData(result.statusBreakdown || []);
                } else {
                    console.warn("API responded with success=false:", result);
                    setError(result.message || "Failed to fetch data.");
                }
            } catch (err) {
                console.error("Chart fetch error:", err);
                setError("Failed to fetch chart data. Please try again.");
            }
        };

        if (externalData) {
            setTotalData(externalData.totalApplications || []);
            setStatusData(externalData.statusBreakdown || []);
        } else {
            fetchChartData();
        }
    }, [apiEndpoint, externalData]);

    // ─── DERIVED VALUES ────────────────────────────────────────────────────────
    const hasStatus = statusData.length > 0;

    // ─── MEMOIZED CHART OPTIONS (always run) ──────────────────────────────────
    const chartOptions = useMemo(() => ({
        chart: { type: "column" },
        title: { text: title },
        xAxis: {
            categories: totalData.map(d => d.documentType),
            title: { text: "Document Type" }
        },
        yAxis: {
            min: 0,
            title: { text: "Number of Applications" }
        },
        tooltip: { shared: true },
        plotOptions: {
            column: { stacking: hasStatus ? "normal" : undefined }
        },
        series: hasStatus
            ? ["Approved", "Pending", "Rejected"].map(status => ({
                name: status,
                data: totalData.map(doc => {
                    const entry = statusData.find(
                        s => s.documentType === doc.documentType && s.status === status
                    );
                    return entry ? entry.count : 0;
                })
            }))
            : [{
                name: "Total",
                data: totalData.map(doc => doc.count),
                colorByPoint: true
            }],
        credits: { enabled: false }
    }), [totalData, statusData, title, hasStatus]);

    // ─── CHART RENDER EFFECT (always run) ─────────────────────────────────────
    useEffect(() => {
        if (!chartContainer.current) return;
        if (typeof window.Highcharts === "undefined") {
            console.error("Highcharts is not loaded globally.");
            return;
        }
        // draw/refresh chart
        window.Highcharts.chart(chartContainer.current, chartOptions);
    }, [chartOptions]);

    // ─── CONDITIONAL RENDERS ─────────────────────────────────────────────────
    if (error) {
        return <p style={{ color: "red" }}>{error}</p>;
    }

    if (totalData.length === 0) {
        return <p>No application data available.</p>;
    }

    return (
        <div
            ref={chartContainer}
            style={{ width: '100%', height: '500px', maxWidth: '100%' }}
        />
    );
};

export default ApplicationByTypeChart;
