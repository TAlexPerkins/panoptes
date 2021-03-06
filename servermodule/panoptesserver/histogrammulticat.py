# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import B64
import math


def response(returndata):
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    propidvalue = DQXDbTools.ToSafeIdentifier(returndata['propidvalue'])
    propidcat = DQXDbTools.ToSafeIdentifier(returndata['propidcat'])
    maxrecordcount = int(returndata['maxrecordcount'])
    encodedquery = returndata['qry']

    whc=DQXDbTools.WhereClause()
    whc.ParameterPlaceHolder='%s'#NOTE!: MySQL PyODDBC seems to require this nonstardard coding
    whc.Decode(encodedquery)
    whc.CreateSelectStatement()

    db = DQXDbTools.OpenDatabase(DQXDbTools.ParseCredentialInfo(returndata), databaseName)
    cur = db.cursor()
    coder = B64.ValueListCoder()

    querystring = " ({0} is not null)".format(propidvalue)
    if len(whc.querystring_params) > 0:
        querystring += " AND ({0})".format(whc.querystring_params)

    if 'binsize' in returndata:
        binsize=float(returndata['binsize'])
    else:
        #Automatically determine bin size
        sql = 'select min({propidvalue}) as _mn, max({propidvalue}) as _mx, count(*) as _cnt from (select {propidvalue} from {tableid} WHERE {querystring} limit {maxrecordcount}) as tmplim'.format(
            propidvalue=propidvalue,
            tableid=tableid,
            querystring=querystring,
            maxrecordcount=maxrecordcount
        )
        cur.execute(sql, whc.queryparams)
        rs = cur.fetchone()
        minval = rs[0]
        maxval = rs[1]
        count  = rs[2]
        if (minval is None) or (maxval is None) or (maxval == minval) or (count == 0):
            returndata['hasdata']=False
            return returndata
        jumpPrototypes = [1, 2, 5]
        optimalbincount = int(math.sqrt(count/10))
        optimalbincount = max(optimalbincount, 2)
        optimalbincount = min(optimalbincount, 200)
        optimalbinsize = (maxval-minval)*1.0/optimalbincount
        mindist = 1.0e99
        binsize = 1
        for jumpPrototype in jumpPrototypes:
            q=math.floor(math.log10(optimalbinsize/jumpPrototype))
            TryJump1A = math.pow(10, q) * jumpPrototype
            TryJump1B = math.pow(10, q + 1) * jumpPrototype
            if abs(TryJump1A - optimalbinsize) < mindist:
                mindist = abs(TryJump1A - optimalbinsize)
                binsize = TryJump1A
            if abs(TryJump1B - optimalbinsize) < mindist:
                mindist = abs(TryJump1B - optimalbinsize)
                binsize = TryJump1B


    returndata['hasdata']=True
    returndata['binsize'] = binsize


    maxbincount = 50000
    cats = []
    buckets = []
    counts = []
    totalcount = 0
    sql = 'select {2} as _propidcat, floor({0}/{1}) as bucket, count(*) as _cnt'.format(propidvalue, binsize, propidcat)
    sql += ' FROM (SELECT {1},{2} FROM {0} '.format(tableid, propidvalue,propidcat)
    sql += " WHERE {0}".format(querystring)
    sql += ' limit {0})  as tmplim'.format(maxrecordcount)
    sql += ' group by bucket,_propidcat'
    sql += ' limit {0}'.format(maxbincount)
    cur.execute(sql, whc.queryparams)
    for row in cur.fetchall():
        if row[1] is not None:
            cats.append(row[0] or '-None-')
            buckets.append(row[1])
            counts.append(row[2])
            totalcount += row[2]

    if len(buckets) >= maxbincount:
        returndata['Error'] = 'Too many bins in dataset'

    if totalcount >= maxrecordcount:
        returndata['Warning'] = 'Number of data points exceeds the limit of {0}.\nData has been truncated'.format(maxrecordcount)

    returndata['cats'] = coder.EncodeStrings(cats)
    returndata['buckets'] = coder.EncodeIntegers(buckets)
    returndata['counts'] = coder.EncodeIntegers(counts)

    return returndata