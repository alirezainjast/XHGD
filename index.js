const {Builder, By, Key, until, Alert} = require('selenium-webdriver');
const cheerio = require('cheerio');
const fs = require('fs')
const download = require('download');
require('dotenv').config()

// can't console inside driver function
const justConsole = (str) =>{
    console.log(str)
}

// counting how many photos are there
let photosCount = 0;
const countPhotos = (parsedHTML) =>{
    const $ = cheerio.load(parsedHTML)
    let tmp = $('.page-title__count').text()
    photosCount = parseInt(tmp)
}

let imagesLink = []
const extractLink = (parsedHTML) =>{
    const $ = cheerio.load(parsedHTML)
    imagesLink.push($('div.fotorama__stage__frame:nth-child(1) > img:nth-child(1)').attr('src'))
}

(async () =>{
    
    let url = process.env.GALLERY_URL;
    let driver = await new Builder()
    .forBrowser('firefox')
    .usingServer('http://localhost:4444/wd/hub')
    .build()

    try{

        await driver.get(url);

        // storing main window id
        let parentId;
        await driver.getWindowHandle().then(id => {parentId = id})
        
        // getting phtocounts
        await driver.getPageSource()
        .then(parsedHTML =>{
            countPhotos(parsedHTML);
        })

        // starting slideshow
        await (await driver.wait(until.elementLocated(By.css("a.red:nth-child(1)")))).click()
        await driver.sleep(3000)
        
        // getting all opened windows or tabs
        let allIdies;
        await driver.getAllWindowHandles().then(ids => {allIdies = ids})
        
        // closing all windows exept main window
        for(let i = 0; i < allIdies.length; i++){
            if(allIdies[i] != parentId){
                await driver.switchTo().window(allIdies[i]);
                await driver.close();
            }
        }

        // switch to main window and stop slider
        await driver.switchTo().window(parentId);
        await driver.actions().keyDown(Key.SPACE).perform();

        // collecting links
        justConsole("collecting link...")
        for(let i = 0; i <= photosCount; i++){
            extractLink( await driver.getPageSource());
            await driver.actions().keyDown(Key.ARROW_RIGHT).perform();
            await driver.sleep(500)            
        }
        await driver.actions().keyDown(Key.ARROW_RIGHT).perform();
        await driver.manage().window().minimize();
        
        // downloading...
        for(let i = 1; i < imagesLink.length; i++){
            let path = process.env.DIRECTORY_PATH;
            fs.writeFileSync(path + i +'.jpg', await download(imagesLink[i].toString()));
            justConsole("downloading... " + imagesLink[i])
        }

    }

    finally{
        await driver.quit();
    }
})();