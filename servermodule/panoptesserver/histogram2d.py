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
    propidx = DQXDbTools.ToSafeIdentifier(returndata['propidx'])
    propidy = DQXDbTools.ToSafeIdentifier(returndata['propidy'])
    maxrecordcount = int(returndata['maxrecordcount'])
    encodedquery = returndata['qry']

    whc=DQXDbTools.WhereClause()
    whc.ParameterPlaceHolder='%s'#NOTE!: MySQL PyODDBC seems to require this nonstardard coding
    whc.Decode(encodedquery)
    whc.CreateSelectStatement()

    db = DQXDbTools.OpenDatabase(DQXDbTools.ParseCredentialInfo(returndata), databaseName)
    cur = db.cursor()
    coder = B64.ValueListCoder()

    querystring = " ({0} is not null) and ({1} is not null)".format(propidx, propidy)
    if len(whc.querystring_params) > 0:
        querystring += " AND ({0})".format(whc.querystring_params)

    if ('binsizex' not in returndata) or ('binsizey' not in returndata):
        # Fetch ranges for both properties, because we will need this
        sql = 'select min({propidx}) as _mnx, max({propidx}) as _mxx, min({propidy}) as _mny, max({propidy}) as _mxy, count(*) as _cnt from (select {propidx}, {propidy} FROM {tableid} WHERE {querystring} limit {maxrecordcount}) as tmp_table'.format(
            propidx=propidx,
            propidy=propidy,
            tableid=tableid,
            querystring=querystring,
            maxrecordcount=maxrecordcount
        )
        cur.execute(sql, whc.queryparams)
        rs = cur.fetchone()
        minvals = [rs[0], rs[2]]
        maxvals = [rs[1], rs[3]]
        count = rs[4]

    for dimnr in range(2):
        binsizename = ['binsizex', 'binsizey'][dimnr]
        propid = [propidx, propidy][dimnr]

        if binsizename in returndata:
            binsize=float(returndata[binsizename])
        else:
            #Automatically determine bin size
            minval = minvals[dimnr]
            maxval = maxvals[dimnr]
            if (minval is None) or (maxval is None) or (maxval == minval) or (count == 0):
                returndata['hasdata']=False
                return returndata
            jumpPrototypes = [1, 2, 5]
            optimalbincount = int(0.75*math.pow(count, 0.5))
            optimalbincount = max(optimalbincount, 2)
            optimalbincount = min(optimalbincount, 50)
            optimalbinsize = (maxval-minval)/optimalbincount
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

        if dimnr == 0:
            binsizex = binsize
        else:
            binsizey = binsize




    returndata['hasdata']=True
    returndata['binsizex'] = binsizex
    returndata['binsizey'] = binsizey

    maxbincount = 50000
    bucketsx = []
    bucketsy = []
    counts = []
    tablesource = 'select {propidx}, {propidy} from {tableid} where {querystring} limit {maxrecordcount}'.format(
        propidx=propidx,
        propidy=propidy,
        tableid=tableid,
        querystring=querystring,
        maxrecordcount=maxrecordcount
    )
    sql = 'select floor({propidx}/{binsizex}) as bucketx, floor({propidy}/{binsizey}) as buckety, count(*) as _cnt from ({tablesource}) as tmp_table'.format(
        tablesource=tablesource,
        propidx=propidx,
        binsizex=binsizex,
        propidy=propidy,
        binsizey=binsizey)
    sql += ' group by bucketx, buckety'
    sql += ' limit {0}'.format(maxbincount)
    cur.execute(sql, whc.queryparams)
    totalcount = 0
    for row in cur.fetchall():
        if (row[0] is not None) and (row[1] is not None):
            bucketsx.append(row[0])
            bucketsy.append(row[1])
            counts.append(row[2])
            totalcount += row[2]

    if len(bucketsx) >= maxbincount:
        returndata['Error'] = 'Too many bins in dataset'

    if totalcount >= maxrecordcount:
        returndata['Warning'] = 'Number of data points exceeds the limit of {0}.\nData has been truncated'.format(maxrecordcount)


    returndata['bucketsx'] = coder.EncodeIntegers(bucketsx)
    returndata['bucketsy'] = coder.EncodeIntegers(bucketsy)
    returndata['densities'] = coder.EncodeIntegers(counts)

    return returndata