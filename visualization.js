// Configuration
const margin = { top: 40, right: 40, bottom: 60, left: 70 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Colors for different exams
const colors = {
  "Midterm 1": "#1f77b4",
  "Midterm 2": "#ff7f0e",
  Final: "#2ca02c",
};

// Shape generators for different students
const studentShapes = {
  S01: d3.symbolCircle,
  S02: d3.symbolSquare,
  S03: d3.symbolTriangle,
  S04: d3.symbolDiamond,
  S05: d3.symbolStar,
  S06: d3.symbolCross,
  S07: d3.symbolWye,
  S08: d3.symbolCircle, // Reuse shapes with different colors
  S09: d3.symbolSquare,
  S10: d3.symbolTriangle,
};

// Units for each measure
const measureUnits = {
  HR: "BPM",
  EDA: "μS",
  TEMP: "°C",
  BVP: "a.u.",
};

// Labels for each statistical measure
const statLabels = {
  avg: "Average",
  median: "Median",
  max: "Maximum",
  min: "Minimum",
  q1: "1st Quartile",
  q3: "3rd Quartile",
  range: "Range",
  iqr: "IQR",
};

// Set up the SVG when document is ready
document.addEventListener("DOMContentLoaded", function () {
  // Set up the SVG
  const svg = d3
    .select("#chart")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Add grid lines container (added before other elements so it's in the background)
  const grid = svg.append("g").attr("class", "grid");

  // Add X axis label
  svg
    .append("text")
    .attr("class", "axis-label x-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .text("Heart Rate (BPM)");

  // Add Y axis label
  svg
    .append("text")
    .attr("class", "axis-label y-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .text("Exam Score");

  // Create tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Define scales
  const xScale = d3.scaleLinear().range([0, width]);
  const yScale = d3.scaleLinear().domain([0, 100]).range([height, 0]);

  // Define axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);

  // Add axes to SVG
  const gxAxis = svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis);

  const gyAxis = svg.append("g").attr("class", "y-axis").call(yAxis);

  // Create functions for grid lines
  function xGridLines() {
    return d3.axisBottom(xScale).tickSize(-height).tickFormat("");
  }

  function yGridLines() {
    return d3.axisLeft(yScale).tickSize(-width).tickFormat("");
  }

  // Add the X grid lines
  const xGrid = grid
    .append("g")
    .attr("class", "grid x-grid")
    .attr("transform", `translate(0,${height})`)
    .call(xGridLines());

  // Add the Y grid lines
  const yGrid = grid
    .append("g")
    .attr("class", "grid y-grid")
    .call(yGridLines());

  // Variables to store data and current selection
  let data;
  let currentMeasure = "HR";
  let currentStat = "avg";

  // Create symbol generator
  const symbolGenerator = d3.symbol().size(150);

  // Helper function to check if a value is valid for plotting
  function isValidValue(value) {
    return (
      value !== null &&
      value !== undefined &&
      value !== "NaN" &&
      !isNaN(value) &&
      isFinite(value)
    );
  }

  // Helper function to format measurement values with appropriate precision
  function formatMeasureValue(value, measure) {
    if (!isValidValue(value)) return "N/A";

    // Use more decimal places for small values like BVP
    if (measure === "BVP" || Math.abs(value) < 0.1) {
      return value.toFixed(4);
    } else if (Math.abs(value) < 1) {
      return value.toFixed(3);
    } else {
      return value.toFixed(2);
    }
  }

  // Helper to compute derived statistical measures if not directly in the data
  function computeStatValue(studentId, examType, measure, stat) {
    // First try to get the direct value from the data
    const baseKey = `${measure}_${stat}`;

    // Filter to get all data points for this student and exam
    const studentExamData = data.filter(
      (d) => d.student_id === studentId && d.exam_type === examType
    );

    if (!studentExamData.length) return NaN;

    // If the stat is available directly, return it
    if (studentExamData[0][baseKey] !== undefined) {
      return studentExamData[0][baseKey];
    }

    // For derived stats that need computation
    const dataPoints = [];
    for (let point of studentExamData) {
      for (let key in point) {
        if (
          key.startsWith(`${measure}_`) &&
          key !== `${measure}_avg` &&
          isValidValue(point[key])
        ) {
          dataPoints.push(point[key]);
        }
      }
    }

    if (!dataPoints.length) return NaN;

    // Sort data for quartiles and median
    const sortedData = [...dataPoints].sort((a, b) => a - b);

    switch (stat) {
      case "median":
        const mid = Math.floor(sortedData.length / 2);
        return sortedData.length % 2 !== 0
          ? sortedData[mid]
          : (sortedData[mid - 1] + sortedData[mid]) / 2;
      case "max":
        return Math.max(...dataPoints);
      case "min":
        return Math.min(...dataPoints);
      case "q1":
        return sortedData[Math.floor(sortedData.length * 0.25)];
      case "q3":
        return sortedData[Math.floor(sortedData.length * 0.75)];
      case "range":
        return Math.max(...dataPoints) - Math.min(...dataPoints);
      case "iqr":
        const q1 = sortedData[Math.floor(sortedData.length * 0.25)];
        const q3 = sortedData[Math.floor(sortedData.length * 0.75)];
        return q3 - q1;
      default:
        return NaN;
    }
  }

  // Load and process the data
  d3.json("processed_data.json")
    .then((jsonData) => {
      console.log("Raw data loaded:", jsonData);
      data = jsonData;

      // Clean data - convert string "NaN" to actual NaN for D3
      data.forEach((d) => {
        for (let key in d) {
          if (d[key] === "NaN") {
            d[key] = NaN;
          }
        }
      });

      // Create the student legend
      createStudentLegend();

      d3.select(".loading").remove();
      updateVisualization();

      // Add event listeners
      d3.select("#measure-select").on("change", function () {
        currentMeasure = d3.select(this).property("value");
        updateVisualization();
      });

      d3.select("#stat-select").on("change", function () {
        currentStat = d3.select(this).property("value");
        updateVisualization();
      });
    })
    .catch((error) => {
      console.error("Error loading data:", error);
      d3.select(".loading").text(
        "Error loading data. Please check console for details."
      );
    });

  // Function to create the student legend
  function createStudentLegend() {
    const studentIds = [...new Set(data.map((d) => d.student_id))].sort();
    const legendContainer = d3.select("#student-legend");

    legendContainer.selectAll("*").remove();

    studentIds.forEach((studentId) => {
      const legendItem = legendContainer
        .append("div")
        .attr("class", "legend-item student-legend-item");

      legendItem
        .append("svg")
        .attr("width", 20)
        .attr("height", 20)
        .append("path")
        .attr("transform", "translate(10, 10)")
        .attr(
          "d",
          symbolGenerator.type(studentShapes[studentId] || d3.symbolCircle)
        )
        .style("fill", "#555");

      legendItem.append("div").text(studentId);
    });
  }

  function updateVisualization() {
    // Prepare the data with computed statistics if needed
    const preparedData = data.map((d) => {
      const measuredValue = computeStatValue(
        d.student_id,
        d.exam_type,
        currentMeasure,
        currentStat
      );
      return {
        ...d,
        currentValue: measuredValue,
      };
    });

    // Filter out data points without valid values
    const validData = preparedData.filter((d) => isValidValue(d.currentValue));

    console.log(
      `Filtered data for ${currentMeasure} ${currentStat}:`,
      validData.length,
      "valid points"
    );

    if (validData.length === 0) {
      console.warn("No valid data points found for the current selection");
    }

    // Update x axis label with proper unit
    const unit = measureUnits[currentMeasure] || "";
    const statLabel = statLabels[currentStat] || currentStat;
    d3.select(".x-label").text(`${currentMeasure} (${statLabel} ${unit})`);

    // Update x scale domain based on data
    const xMin = d3.min(validData, (d) => d.currentValue);
    const xMax = d3.max(validData, (d) => d.currentValue);

    // Add padding to domain and handle case where min/max are the same
    let xPadding = 0.1;
    if (xMin === xMax) {
      xScale.domain([xMin * 0.9, xMin * 1.1].filter(isValidValue));
    } else {
      const range = xMax - xMin;
      xPadding = range * 0.05;
      xScale.domain([xMin - xPadding, xMax + xPadding]);
    }

    // Update axes with transition
    svg.select(".x-axis").transition().duration(750).call(xAxis);

    // Update grid lines
    svg.select(".x-grid").transition().duration(750).call(xGridLines());
    svg.select(".y-grid").transition().duration(750).call(yGridLines());

    // Select all data points
    const points = svg
      .selectAll(".data-point")
      .data(validData, (d) => `${d.student_id}-${d.exam_type}`);

    // Exit points that no longer exist
    points.exit().transition().duration(750).style("opacity", 0).remove();

    // Update existing points
    points
      .transition()
      .duration(750)
      .attr(
        "transform",
        (d) => `translate(${xScale(d.currentValue)}, ${yScale(d.grade)})`
      )
      .attr("fill", (d) => colors[d.exam_type]);

    // Enter new points
    points
      .enter()
      .append("path")
      .attr("class", "data-point")
      .attr("d", (d) =>
        symbolGenerator.type(studentShapes[d.student_id] || d3.symbolCircle)()
      )
      .attr(
        "transform",
        (d) => `translate(${xScale(d.currentValue)}, ${yScale(d.grade)})`
      )
      .attr("fill", (d) => colors[d.exam_type])
      .style("opacity", 0)
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(
            `
            <strong>Student:</strong> ${d.student_id}<br/>
            <strong>Exam:</strong> ${d.exam_type}<br/>
            <strong>Score:</strong> ${d.grade.toFixed(1)}<br/>
            <strong>${statLabel} ${currentMeasure}:</strong> ${formatMeasureValue(d.currentValue, currentMeasure)} ${unit}
            `
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(500).style("opacity", 0);
      })
      .transition()
      .duration(750)
      .style("opacity", 1);
  }
});
