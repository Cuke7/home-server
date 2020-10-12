function get_temp() {
  return fetch("/get_rasp_temp")
    .then((response) => {
      return response.json();
    })
    .catch(() => {
      return null;
    });
}

get_temp().then((val) => disp_temp(val));

function disp_temp(data) {
  var ctx = document.getElementById("myChart").getContext("2d");

  let lines = data.split("\n");
  let temps = [];
  let times = [];

  for (const line of lines) {
    let temp = line.split(":");
    temps.push(Number(temp[3].trim()));
    temp = line.split(",");
    times.push(
      temp[1].split(":")[0] +
        ":" +
        temp[1].split(":")[1] +
        ":" +
        temp[1].split(":")[2]
    );
  }

  console.log(temps);
  console.log(times);

  var myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: times,
      datasets: [
        {
          label: "Raspberry temperature",
          data: temps,
        },
      ],
    },
  });
}
