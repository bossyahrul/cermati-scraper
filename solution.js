#!/usr/bin/env node
'use strict'

const pMap = require('p-map')
const cheerio = require('cheerio')
const got = require('got')
const { resolve } = require('url')
const fs = require('fs')

const baseUrl = 'https://www.cermati.com'

exports.main = async () => {
    const { body } = await got(`${baseUrl}/artikel`)
    const $ = cheerio.load(body)
    const articles = $('.list-of-articles .article-list-item').get().map((article) => {
        try {
            const $article = $(article)
            const $link = $article.find('a')
            const url = resolve(baseUrl, $link.attr('href'))
            return {
                url
            }
        } catch (err) {
            console.log('parse error', err)
        }
    }).filter(Boolean)
    // use 'p-map' to set a practical limit on parallelism whether it be throttling network bandwidth or compute resources.
    // drop-in replacement for Promise.all(…), which doesn’t support limiting parallelism.
    return (await pMap(articles, processArticlePage, {
        concurrency: 3
    })).filter(Boolean)
}

async function processArticlePage(article){
    try {
        const {body} = await got(article.url)
        const $ = cheerio.load(body)
        const author = $('.author-name').text().trim()
        const postingDate = $('.post-date > span').text().trim()
        const title = $('h1.post-title').text().trim()
        const relatedArticles = $('.panel-items-list li').slice(0,5).get().map(relatedArticle => {
            const $relatedArticle = $(relatedArticle)
            const $link = $relatedArticle.find('a')
            const url = resolve(baseUrl, $link.attr('href'))
            const title = $relatedArticle.find('h5').text().trim()
            return {
                url,
                title
            }
        })
        return {
            url: article.url,
            title,
            author,
            postingDate,
            relatedArticles
        }
    } catch (error) {
        console.error(error.message)
    }
}

if (!module.parent) {
    exports.main()
        .then((articles) => {
            const json = JSON.stringify({articles}, null, 2)
            console.log(json)
            fs.writeFileSync('solution.json', json)
            process.exit(0)
        })
        .catch((err) => {
            console.error(err)
            process.exit(1)
        })
}