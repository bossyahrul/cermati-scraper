#!/usr/bin/env node
'use strict'

const pMap = require('p-map')
const cheerio = require('cheerio')
const got = require('got')
const { resolve } = require('url')

const baseUrl = 'https://www.cermati.com'

exports.main = async () => {
    const { body } = await got(`${baseUrl}/artikel`)
    const $ = cheerio.load(body)
    const articles = $('.list-of-articles .article-list-item').get().map((article) => {
        try {
            const $article = $(article)
            const $link = $article.find('a')
            const url = resolve(baseUrl, $link.attr('href'))
            const title = $article.find('h3').text().trim()
            const postingDate = $article.find('.item-description .item-publish-date').children().eq(1).text().trim()
            return {
                url,
                title,
                postingDate
            }
        } catch (err) {
            console.log('parse error', err)
        }
    }).filter(Boolean)
    return (await pMap(articles, processDetailPage, {
        concurrency: 3
    })).filter(Boolean)
}

// url ^
// title ^ 
// postingDate ^
// author
// relatedArticles -> url, title

async function processDetailPage(article){
    console.warn('processing article', article.url)
    try {
        const {body} = await got(article.url)
        const $ = cheerio.load(body)
        const authorName = $('.author-name').text().trim()
        return {
            authorName
        }
    } catch (error) {
        
    }
}

if (!module.parent) {
    exports.main()
        .then((articles) => {
            console.log(JSON.stringify(articles, null, 2))
            process.exit(0)
        })
        .catch((err) => {
            console.error(err)
            process.exit(1)
        })
}