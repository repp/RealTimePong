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
          minSpeed:8,
          maxSpeed:18,
          acceleration:1.15,
          bounceFriction:0.3,
          slideFriction:0.7
      },
      ball:{
          diameter:7,
          maxServeSpeed:12,
          minServeSpeed:11,
          acceleration:1.08,
          maxSpeed:18
      },
      game:{
          serveDelay:1500,
          winningScore:5,
          fps:24 // ~ 42 fps (1000/24)
      }
  };
};