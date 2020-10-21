const bent = require('bent')

const monitor_delay = 10000
const url = 'https://inventory.g5marketingcloud.com/api/v1/apartment_complexes/g5-cl-1hy09e989w-estates-on-frankford/floorplans'
const webhook = 'ADD DISCORD WEBHOOK HERE'
function getAptLink(_id) {
    return `https://www.rentanapt.com/apartments/tx/dallas/estates-on-frankford/floor-plans#/apartment/${_id}/details`
}

const getJSON = bent('json')
const post = bent('POST', 'json', 200)

let aptQueue = [],
    apartments = {
        /*format:
        0: {
            id : 0,
            type: "0 Bed x0 Bath",
            price: "$0",   
            availability_date: "2020-10-30",
            image_url: "https://test.com/0.png"
        }*/
    }

monitorSite()
sendHooks()

function monitorSite() {
    getJSON(url)
    .then(data => {
        //make sure the json has what we need
        if (data.floorplans){ 
            //iterate through each floorplan
            data.floorplans.forEach(plan => {
                //iterate through each apartment ID in it's corresponding floorplan
                plan.apartment_ids.forEach(id => {
                    //get apartment data with its ID
                    let apt = data.apartments.find(a => a.id == id)

                    //make sure we got apartment data from find()
                    if (apt) {
                        //get the price_id from apartment data then get corresponding price from the prices object
                        let price_id = apt.price_ids[0]
                        let price = data.prices.find(p => p.id == price_id).formatted_price

                        addApartment(id, plan.name, price, apt.availability_date, plan.image_url)
                    }
                    else
                        console.error("Apartment not found in data.apartments")
                })
            })
        }
        else 
            console.error("Missing json data from request.")
        
        setTimeout(monitorSite, monitor_delay)
    })
    .catch(err => {
        console.error(err)
    })      
}

function addApartment(_id, _type, _price, _date, _image_url) {
    //make sure the apartment hasn't already been added
    if (!apartments[_id]) {
        //create apartment object
        apartments[_id] = {
            id: _id,
            type: _type,
            price: _price,
            availability_date: _date,
            image_url: _image_url 
        }
        console.log(`added apartment ${_id}`)

        //add apartment object to queue to be sent via webhook
        aptQueue.push(apartments[_id])
    }
    else 
        console.log(`apartment ${_id} already exists`)  
}

function sendHooks () {
    //make sure queue contains at least one apartment
    if (aptQueue.length > 0) {
        //get the first apartment and remove from the queue/array
        let apt = (aptQueue.splice(0, 1))[0]

        //create the embeded discord message
        let discord_msg = {
            username: 'Apartment Hunter',
            avatar_url: 'https://cdn.pixabay.com/photo/2017/10/30/20/52/condominium-2903520_960_720.png',
            embeds: [
                {
                    title: `New Listing: ${apt.type}`,
                    color: 11502817,
                    description: `Price: ${apt.price}\nAvailable ${apt.availability_date}\n[View](${getAptLink(apt.id)})`,
                    thumbnail: { url: apt.image_url }
                }
            ]
        }
    
        //post the message to our discord webhook url
        post(webhook, discord_msg)
        .then(rsp => {
            //do nothing
        })
        .catch(err => {
            //requeue apartment to try again
            aptQueue.push(apt)
        })
    }

    //send one apartment every 3500ms if queue size > 0
    setTimeout(sendHooks, 3500)
}