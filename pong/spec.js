exports.load = function() {
  return {
      field:{
          width:800,
          height:525,
          leftPaddleX:30,
          rightPaddleX:760
      },
      paddle:{
          width:10,
          height:90,
          minSpeed:5,
          maxSpeed:12,
          acceleration:1.15,
          bounceFriction:0.3,
          slideFriction:0.7
      },
      ball:{
          diameter:7,
          maxServeSpeed:8,
          minServeSpeed:7,
          acceleration:1.08,
          maxSpeed:12
      },
      game:{
          serveDelay:1500,
          winningScore:5,
          updateInterval: 25,
          fps:60
      }
  };
};