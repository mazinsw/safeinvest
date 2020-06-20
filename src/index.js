const fundamentus = require('./ft-scraper')
const fiis = require('./fiis-scraper')
const fs = require('fs')
const path = require('path')

const papeis = require('./papeis.json').data
const indicadores = require('./indicadores.json').data
const fundos = require('./fundos.json').data

const formatCurr = value => {
    return value.toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })
}

const sortFields = (array, order) => {
    return array.sort((a, b) => {
        return order.reduce((result, { campo, ordem }) => {
            if (result) {
                return result
            }
            if (ordem == 'asc') {
                return a[campo] - b[campo]
            }
            return b[campo] - a[campo]
        }, 0)
    })
}

const populate = async () => {
    let result = []
    const loaded = new Set(indicadores.map(({ papel }) => papel))
    const remaining = papeis.slice()
    while (remaining.length > 0) {
        const tasks = []
        while (tasks.length < 10 && remaining.length > 0) {
            const papel = remaining.shift()
            const ticket = papel.code.replace(/\..*/, '')
            if (loaded.has(ticket)) {
                console.log(`Ticket ${ticket} já foi carregado`)
                continue
            }
            loaded.add(ticket)
            console.log(`A processar ticket ${ticket}`)
            tasks.push(fundamentus.fetch(ticket))
        }
        try {
            const results = await Promise.all(tasks)
            console.log(`${results.length} itens processados`)
            const validResults = results.filter(data => data)
            console.log(`${validResults.length} novos itens válidos`)
            result = result.concat(validResults)
            console.log(`Total de itens válidos: ${result.length}`)
            fs.writeFileSync(path.join(__dirname, 'indicadores.json'), JSON.stringify({
                data: result
            }))
        } catch (error) {
            console.error(error)
        }
    }
}

const syncronizeIndicator = async () => {
    let position = 0
    while (position < indicadores.length) {
        const tasks = []
        while (tasks.length < 50 && position < indicadores.length) {
            const indicador = indicadores[position]
            const papel = indicador.papel
            tasks.push(fundamentus.fetch(papel))
            position++
        }
        try {
            const results = await Promise.all(tasks)
            console.log(`${position} / ${indicadores.length} itens processados`)
            results.forEach((data, index) => {
                const indicadorIndex = position - tasks.length + index
                const indicador = indicadores[indicadorIndex]
                indicadores[indicadorIndex] = data || indicador
            })
            fs.writeFileSync(path.join(__dirname, 'indicadores.json'), JSON.stringify({
                data: indicadores
            }, null, 2))
        } catch (error) {
            console.error(error)
        }
    }
}

const syncronizeFunds = async () => {
    try {
        const list = await fiis.fetchList()
        let finalResult = []
        let position = 0
        while (position < list.length) {
            const tasks = []
            while (tasks.length < 10 && position < list.length) {
                const ticket = list[position]
                tasks.push(fiis.fetch(ticket))
                position++
            }
            const results = await Promise.all(tasks)
            const filtered = results.filter(o => o)
            finalResult = finalResult.concat(filtered)
            console.log(`${position} / ${list.length} fundos processados`)
            fs.writeFileSync(path.join(__dirname, 'fundos.json'), JSON.stringify({
                data: finalResult
            }, null, 2))
        }
    } catch (error) {
        console.error(error)
    }
}

const sortBenjaminGrahamFilter = async () => {

    const filtered = indicadores.filter(({ liquidez_corrent, PL, LPA, dividendos }) => {
        if (!(liquidez_corrent > 1.5)) {
            return false
        }
        if (!(LPA > 0)) {
            return false
        }
        if (!(0 < PL && PL < 20)) {
            return false
        }
        if (!(dividendos > 0)) {
            return false
        }
        return true
    })
    const ordenar = [
        { campo: 'dividendos', ordem: 'desc' },
        { campo: 'PL', ordem: 'asc' },
        { campo: 'liquidez_corrent', ordem: 'desc' }
    ]
    const results = sortFields(filtered, ordenar)
    console.table(results.map(({ papel, liquidez_corrent, PL, LPA, dividendos }) => ({
        '1. Papel': papel,
        '2. Dividendos': dividendos.toLocaleString('pt-BR') + '%',
        '3. P/L': PL.toLocaleString('pt-BR') + ' anos',
        '4. Liquidês': liquidez_corrent.toLocaleString('pt-BR'),
        '5. LPA': formatCurr(LPA),
        '6. Cotação': formatCurr(PL * LPA),
    })))
}

const sortFunds = async () => {

    const calcVariance = list => {
        const values = list.map(a => a.dividend)
        const avg = values.reduce((r, v) => r + v, 0) / (values.length || 1)
        const variance = values.reduce((r, v) => r + Math.pow(v - avg, 2), 0) /  2
        return Math.sqrt(variance)
    }

    const mapped = fundos.map(fund => {
        const variance = calcVariance(fund.dividends)
        return {
            ...fund,
            variance,
            stdDev: Math.sqrt(variance),
            magicNumber: Math.ceil(fund.value > 0 ? fund.price / fund.value : 0),
            ROI: fund.price > 0 ? fund.value * 100 / fund.price : 0
        }
    })
    const filtered = mapped.filter(({ price, value }) => {
        if (!(price > 0)) {
            return false
        }
        if (!(value > 0.01)) {
            return false
        }
        return true
    })
    const ordenar = [
        { campo: 'ROI', ordem: 'desc' },
        { campo: 'variance', ordem: 'asc' },
        { campo: 'magicNumber', ordem: 'asc' }
    ]
    const results = sortFields(filtered, ordenar)
    console.table(results.map(({ fundSymbol, value, ROI, variance, magicNumber, price }) => ({
        '1. Fundo': fundSymbol,
        '2. Dividendos': formatCurr(value),
        '3. ROI': ROI.toLocaleString('pt-BR') + '%',
        '4. Magic Number': magicNumber.toLocaleString('pt-BR') + ' cotas',
        '5. Variância': formatCurr(variance),
        '6. Cotação': formatCurr(price),
    })))
}

const args = process.argv.slice(2)
if (args.includes('--sync')) {
    syncronizeIndicator()
    syncronizeFunds()
} else if (args.includes('--funds')) {
    sortFunds()
} else {
    sortBenjaminGrahamFilter()
}
