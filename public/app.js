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
  console.log(data);
  let lines = data.split("\n");
  let temps = [];
  let times = [];

  for (const line of lines) {
    let temp = line.split(":");
    if(temp !=""){
      temps.push(Number(temp[3].trim()));
      let temp2 = line.split(",");
      times.push(
        temp2[1].split(":")[0] +
          ":" +
          temp2[1].split(":")[1] +
          ":" +
          temp2[1].split(":")[2]
    );
}
    
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
