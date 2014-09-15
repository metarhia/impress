module.exports = function(client, callback) {

  callback({
    phone: {
      model: "Motorola Photom Q 4G LTE",
      os: "Android 4.0.4 (Ice Cream Sandwich)",
      keyboard: "QWERTY",
      formfactor: "QWERTY Slider",
      memory: "1GB RAM x 8GB ROM",
      networks: [
        "WCDMA 1900/850/2100",
        "CDMA 1900/800",
        "GSM 850/1900/1800/900",
        "LTE 1900",
        "HSDPA 21.1 Mbps (Category 14)",
        "HSUPA 5.76 Mbps"
      ],
      processor: "1.5GHz Dual-Core",
      microSD: "Up to 32 GB",
      sensors: ["Accelerometer", "proximity sensor", "ambient light sensor"],
      camera: {
        megapixels: {
          back: 8,
          front: 1.3
        },
        zoom: "Digital zoom",
        flash: "LED",
        focus: "Automatic",
      },
      connectivity: {
        wifi: "802.11 b,g,n",
        bluetooth: "Bluetooth® Class 2, Version 4.0 LE+EDR",
        hotspot: "4G Mobile Hotspot",
        connectors: ["Micro USB", "micro HDMI"],
        usb: "USB 2.0 (High Speed, 480 Mbps)",
        gps: ["eCompass", "Standalone GPS", "aGPS (assisted)"],
        headset: "jack 3.5 mm",
      },
      physical: {
        size: {
          x: "66.00mm",
          y: "126.40mm",
          z: "13.70mm"
        },
        weight: "170 grams",
        display: {
          type: "540x960 ppi TFT LCD",
          size: "4.3-inch"
        }
      },
      power: {
        battery: "1785 mAh",
        talk: "Up to 7.5 hrs",
        standby: "Up to 220 hrs"
      }
    }
  });

}